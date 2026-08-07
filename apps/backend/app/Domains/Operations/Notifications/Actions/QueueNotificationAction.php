<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Actions;

use App\Domains\Operations\Notifications\Audit\AuditLogger;
use App\Domains\Operations\Notifications\Exceptions\NotificationValidationException;
use App\Domains\Operations\Notifications\Jobs\SendNotificationJob;
use App\Domains\Operations\Notifications\Models\Notification;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use App\Domains\Operations\Notifications\Support\TemplateRenderer;
use Illuminate\Support\Facades\DB;

/**
 * MODULE:NOTIFICATIONS' "Send notification (internal, event-triggered)"
 * Public Contract — the ONE entry point every cross-domain listener in
 * app/Listeners/Send*.php calls. Never called with business logic of its
 * own: a caller supplies a template code (or an inline subject/body), a
 * channel, a recipient, and merge data — this Action never decides
 * *whether* to notify someone, only *how* to queue what it was told to
 * send, per this module's "MUST NOT contain business logic from
 * Orders, Payments, Shipping, Fulfillment, Returns, Customers" rule.
 *
 * Deliberately does not send anything itself — creates the Notification
 * row (status: pending -> queued) and dispatches Jobs\SendNotificationJob
 * onto config('notifications.queue_connection'), per ADR-0004's
 * externalized queue backbone. The actual provider call happens only
 * inside that job, via Actions\SendNotificationAction, so a slow or
 * temporarily-unreachable email provider never blocks the HTTP request or
 * event-bus publish() call that triggered this notification.
 */
final readonly class QueueNotificationAction
{
    public function __construct(
        private AuditLogger $auditLogger,
        private TemplateRenderer $templateRenderer,
    ) {}

    /**
     * @param  array<string, scalar|null>  $mergeData
     */
    public function execute(
        string $channel,
        string $recipient,
        ?string $templateCode = null,
        array $mergeData = [],
        ?string $locale = 'en',
        ?string $subject = null,
        ?string $body = null,
        ?string $relatedType = null,
        ?string $relatedId = null,
        ?string $actorId = null,
    ): Notification {
        $templateId = null;

        if ($templateCode !== null) {
            $template = NotificationTemplate::query()
                ->where('code', $templateCode)
                ->where('channel', $channel)
                ->where('locale', $locale)
                ->where('is_active', true)
                ->first();

            if ($template === null) {
                throw new NotificationValidationException('template_not_found', "No active template found for code [{$templateCode}], channel [{$channel}], locale [{$locale}].");
            }

            $rendered = $this->templateRenderer->render($template, $mergeData);
            $subject = $rendered->subject;
            $body = $rendered->body;
            $templateId = $template->id;
        }

        if ($body === null) {
            throw new NotificationValidationException('no_content', 'A notification must be given either a template_code or an inline body.');
        }

        return DB::transaction(function () use ($channel, $recipient, $templateId, $mergeData, $subject, $body, $relatedType, $relatedId, $actorId) {
            $notification = Notification::query()->create([
                'notification_template_id' => $templateId,
                'channel' => $channel,
                'recipient' => $recipient,
                'subject' => $subject,
                'body' => $body,
                'context' => $mergeData === [] ? null : $mergeData,
                'related_type' => $relatedType,
                'related_id' => $relatedId,
                'max_attempts' => config('notifications.retry.max_attempts', 5),
            ]);

            $notification->assertCanTransitionTo(Notification::STATUS_QUEUED);
            $notification->status = Notification::STATUS_QUEUED;
            $notification->save();

            $this->auditLogger->log(
                action: 'notification.queued',
                actorId: $actorId,
                targetType: Notification::class,
                targetId: $notification->id,
                after: $notification->only(['channel', 'recipient', 'status', 'related_type', 'related_id']),
            );

            SendNotificationJob::dispatch($notification->id)
                ->onConnection(config('notifications.queue_connection'))
                ->onQueue(config('notifications.queue_name'));

            return $notification;
        });
    }
}
