<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Actions;

use App\Domains\Operations\Notifications\Audit\AuditLogger;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Support\Facades\DB;

final readonly class UpdateNotificationTemplateAction
{
    private const array TRACKED_FIELDS = ['subject', 'body', 'is_active'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(NotificationTemplate $template, array $changes, int $expectedVersion, ?string $actorId): NotificationTemplate
    {
        return DB::transaction(function () use ($template, $changes, $expectedVersion, $actorId) {
            $template->assertVersionMatches($expectedVersion);

            $before = $template->only(self::TRACKED_FIELDS);
            $template->fill($changes)->save();

            $this->auditLogger->log(
                action: 'notification_template.updated',
                actorId: $actorId,
                targetType: NotificationTemplate::class,
                targetId: $template->id,
                before: $before,
                after: $template->only(self::TRACKED_FIELDS),
            );

            return $template;
        });
    }
}
