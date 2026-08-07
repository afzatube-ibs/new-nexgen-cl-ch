<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Jobs;

use App\Domains\Operations\Notifications\Actions\SendNotificationAction;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * MODULE:NOTIFICATIONS' "Notification Queue" made concrete — the
 * platform's first real use of ADR-0004's externalized, Redis-backed
 * queue backbone (every prior module's own cross-domain reaction runs
 * synchronously, in-process, via the domain event bus per
 * ARCH:CROSS_DOMAIN_COMMUNICATION; this is deliberately different,
 * since a slow or unreachable external email provider must never block
 * the request or event that triggered the notification).
 *
 * Deliberately thin: all business logic — resolving the provider,
 * calling it, logging the attempt, deciding the retry backoff — lives in
 * Actions\SendNotificationAction, fully unit-testable without a queue
 * worker at all. This job's only job is the queue-integration glue:
 * invoke that Action, and if it left the Notification `queued` again
 * with a `next_retry_at` in the future, dispatch a fresh delayed instance
 * of itself for that moment — Retry Policy driven by domain-level data
 * (Models\Notification::$next_retry_at), not the queue driver's own
 * opaque retry mechanism. Laravel's own job-level retry is deliberately
 * NOT used ($tries = 1): a provider failure is not this job's own
 * failure to report to the queue's dead-letter handling, since Actions\
 * SendNotificationAction has already recorded and decided what to do
 * about it.
 */
final class SendNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public readonly string $notificationId) {}

    public function handle(SendNotificationAction $sendNotificationAction): void
    {
        $notification = Notification::query()->findOrFail($this->notificationId);

        $notification = $sendNotificationAction->execute($notification);

        if ($notification->status === Notification::STATUS_QUEUED && $notification->next_retry_at !== null) {
            $delaySeconds = max(0, now()->diffInSeconds($notification->next_retry_at, false));

            self::dispatch($this->notificationId)
                ->onConnection($this->connection)
                ->onQueue($this->queue)
                ->delay(now()->addSeconds($delaySeconds));
        }
    }
}
