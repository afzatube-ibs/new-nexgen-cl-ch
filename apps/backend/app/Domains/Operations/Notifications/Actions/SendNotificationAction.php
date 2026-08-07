<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Actions;

use App\Domains\Operations\Notifications\Audit\AuditLogger;
use App\Domains\Operations\Notifications\Channels\ProviderResolver;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendRequest;
use App\Domains\Operations\Notifications\Events\NotificationFailed;
use App\Domains\Operations\Notifications\Events\NotificationSent;
use App\Domains\Operations\Notifications\Exceptions\UnsupportedNotificationProviderException;
use App\Domains\Operations\Notifications\Models\Notification;
use App\Domains\Operations\Notifications\Models\NotificationDeliveryAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * The one place a channel provider is actually called — every attempt,
 * successful or not, produces exactly one Models\NotificationDeliveryAttempt
 * row (this module's own "Delivery Attempts" data), and this Action alone
 * decides the resulting Notification Status Lifecycle transition. Called
 * only by Jobs\SendNotificationJob, never directly by a controller —
 * queuing (Actions\QueueNotificationAction) and sending are deliberately
 * two different Actions so the latter is fully unit-testable without a
 * real queue worker.
 *
 * Retry Policy made concrete: on a retryable failure (attempts remain
 * under config('notifications.retry.max_attempts')), this Action
 * transitions the Notification back to `queued` with `next_retry_at` set
 * from config('notifications.retry.backoff_seconds') and returns —
 * Jobs\SendNotificationJob reads that back and releases itself onto the
 * queue with the matching delay, so the backoff schedule itself lives
 * here (domain-level, auditable, unit-testable) rather than inside the
 * queue driver's own opaque retry mechanism.
 */
final readonly class SendNotificationAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
        private ProviderResolver $providerResolver,
    ) {}

    public function execute(Notification $notification): Notification
    {
        return DB::transaction(function () use ($notification) {
            /** @var Notification $notification */
            $notification = Notification::query()->lockForUpdate()->findOrFail($notification->id);

            if ($notification->isTerminal()) {
                return $notification;
            }

            $notification->assertCanTransitionTo(Notification::STATUS_SENDING);
            $notification->status = Notification::STATUS_SENDING;
            $notification->attempts_count++;
            $notification->last_attempted_at = now();
            $notification->save();

            try {
                $provider = $notification->provider_code !== null
                    ? $this->providerResolver->resolve($notification->provider_code)
                    : $this->providerResolver->resolveForChannel($notification->channel);
            } catch (UnsupportedNotificationProviderException $e) {
                return $this->recordFailure($notification, providerCode: $notification->provider_code ?? $notification->channel, failureReason: $e->getMessage());
            }

            try {
                $result = $provider->send(new NotificationSendRequest(
                    recipient: $notification->recipient,
                    subject: $notification->subject,
                    body: $notification->body,
                ));
            } catch (Throwable $e) {
                // A provider's own send() implementation is expected to
                // catch its own transport-level failures and return a
                // 'failed' NotificationSendResult (every provider shipped
                // with this module does) — this is the backstop for
                // anything that still escapes as a raw exception (e.g. an
                // HTTP client's own connection-level failure), so a
                // provider bug can never leave a Notification stuck in
                // `sending` forever. Reuses the identical Retry Policy
                // path as an ordinary reported failure.
                return $this->recordFailure($notification, providerCode: $provider->code(), failureReason: $e->getMessage());
            }

            if ($result->succeeded()) {
                NotificationDeliveryAttempt::query()->create([
                    'notification_id' => $notification->id,
                    'provider_code' => $provider->code(),
                    'status' => NotificationDeliveryAttempt::STATUS_SUCCEEDED,
                    'provider_reference' => $result->providerReference,
                    'response_payload' => $result->raw,
                    'occurred_at' => now(),
                ]);

                $notification->assertCanTransitionTo(Notification::STATUS_SENT);
                $notification->status = Notification::STATUS_SENT;
                $notification->provider_code = $provider->code();
                $notification->sent_at = now();
                $notification->failure_reason = null;
                $notification->save();

                $this->auditLogger->log(
                    action: 'notification.sent',
                    actorId: null,
                    targetType: Notification::class,
                    targetId: $notification->id,
                    after: ['status' => $notification->status, 'provider_code' => $provider->code()],
                );

                $this->eventBus->publish(new NotificationSent(
                    notificationId: $notification->id,
                    channel: $notification->channel,
                    recipient: $notification->recipient,
                    providerCode: $provider->code(),
                ));

                return $notification;
            }

            return $this->recordFailure($notification, providerCode: $provider->code(), failureReason: $result->failureReason ?? 'Unknown delivery failure.', responsePayload: $result->raw);
        });
    }

    /**
     * @param  array<string, mixed>|null  $responsePayload
     */
    private function recordFailure(Notification $notification, string $providerCode, string $failureReason, ?array $responsePayload = null): Notification
    {
        NotificationDeliveryAttempt::query()->create([
            'notification_id' => $notification->id,
            'provider_code' => $providerCode,
            'status' => NotificationDeliveryAttempt::STATUS_FAILED,
            'response_payload' => $responsePayload,
            'failure_reason' => $failureReason,
            'occurred_at' => now(),
        ]);

        $notification->assertCanTransitionTo(Notification::STATUS_FAILED);
        $notification->status = Notification::STATUS_FAILED;
        $notification->failure_reason = $failureReason;

        if ($notification->hasExhaustedRetries()) {
            $notification->failed_at = now();
            $notification->next_retry_at = null;
            $notification->save();

            $this->auditLogger->log(
                action: 'notification.failed',
                actorId: null,
                targetType: Notification::class,
                targetId: $notification->id,
                after: ['status' => $notification->status, 'failure_reason' => $failureReason, 'attempts_count' => $notification->attempts_count],
            );

            $this->eventBus->publish(new NotificationFailed(
                notificationId: $notification->id,
                channel: $notification->channel,
                recipient: $notification->recipient,
                failureReason: $failureReason,
            ));

            return $notification;
        }

        $notification->next_retry_at = now()->addSeconds($this->backoffSeconds($notification->attempts_count));
        $notification->assertCanTransitionTo(Notification::STATUS_QUEUED);
        $notification->status = Notification::STATUS_QUEUED;
        $notification->save();

        $this->auditLogger->log(
            action: 'notification.retry_scheduled',
            actorId: null,
            targetType: Notification::class,
            targetId: $notification->id,
            after: ['status' => $notification->status, 'attempts_count' => $notification->attempts_count, 'next_retry_at' => $notification->next_retry_at?->toIso8601String()],
        );

        return $notification;
    }

    private function backoffSeconds(int $attemptsCount): int
    {
        /** @var list<int> $schedule */
        $schedule = config('notifications.retry.backoff_seconds', [60, 300, 900, 3600, 21600]);
        $index = min($attemptsCount - 1, count($schedule) - 1);

        return $schedule[max($index, 0)];
    }
}
