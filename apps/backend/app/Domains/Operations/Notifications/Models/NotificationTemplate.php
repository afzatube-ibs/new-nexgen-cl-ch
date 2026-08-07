<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Models;

use App\Domains\Operations\Notifications\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\NotificationTemplateFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MODULE:NOTIFICATIONS' Template aggregate root — see the
 * notification_templates migration's own docblock for the full rationale
 * behind the (code, channel, locale) uniqueness shape.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $code
 * @property string $channel
 * @property string $locale
 * @property string|null $subject
 * @property string $body
 * @property bool $is_active
 * @property int $lock_version
 */
final class NotificationTemplate extends Model
{
    /** @use HasFactory<NotificationTemplateFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string CHANNEL_EMAIL = 'email';

    public const string CHANNEL_SMS = 'sms';

    public const string CHANNEL_WHATSAPP = 'whatsapp';

    public const string CHANNEL_IN_APP = 'in_app';

    /**
     * @var list<string>
     */
    public const array CHANNELS = [
        self::CHANNEL_EMAIL,
        self::CHANNEL_SMS,
        self::CHANNEL_WHATSAPP,
        self::CHANNEL_IN_APP,
    ];

    protected $fillable = [
        'code',
        'channel',
        'locale',
        'subject',
        'body',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $template): void {
            $template->tenant_id ??= TenantId::DEFAULT;
            $template->locale ??= 'en';
            $template->is_active ??= true;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default.
            $template->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return NotificationTemplateFactory
     */
    protected static function newFactory(): Factory
    {
        return NotificationTemplateFactory::new();
    }
}
