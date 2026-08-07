<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Actions;

use App\Domains\Operations\Notifications\Audit\AuditLogger;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Support\Facades\DB;

/**
 * Cancels a Notification still waiting to send (`pending`/`queued`) — a
 * superseded or no-longer-relevant notification (e.g. an order was
 * cancelled moments after a confirmation email was queued). Only reaches
 * a Notification before Jobs\SendNotificationJob has picked it up; once
 * `sending` has started, per the Notification Status Lifecycle, it must
 * resolve to `sent` or `failed` — cancellation mid-attempt is not a
 * state this module models, matching Returns' own "no fake recovery
 * path" posture.
 */
final readonly class CancelNotificationAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Notification $notification, int $expectedVersion, ?string $actorId): Notification
    {
        return DB::transaction(function () use ($notification, $expectedVersion, $actorId) {
            $notification->assertVersionMatches($expectedVersion);
            $notification->assertCanTransitionTo(Notification::STATUS_CANCELLED);

            $notification->status = Notification::STATUS_CANCELLED;
            $notification->cancelled_at = now();
            $notification->save();

            $this->auditLogger->log(
                action: 'notification.cancelled',
                actorId: $actorId,
                targetType: Notification::class,
                targetId: $notification->id,
                after: ['status' => $notification->status],
            );

            return $notification;
        });
    }
}
