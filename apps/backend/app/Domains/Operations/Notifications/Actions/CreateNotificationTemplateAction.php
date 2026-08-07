<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Actions;

use App\Domains\Operations\Notifications\Audit\AuditLogger;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Support\Facades\DB;

final readonly class CreateNotificationTemplateAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): NotificationTemplate
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $template = NotificationTemplate::query()->create($attributes);

            $this->auditLogger->log(
                action: 'notification_template.created',
                actorId: $actorId,
                targetType: NotificationTemplate::class,
                targetId: $template->id,
                after: $template->only(['code', 'channel', 'locale', 'subject', 'is_active']),
            );

            return $template;
        });
    }
}
