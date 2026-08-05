<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\PaymentWebhookEventFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * See the payment_webhook_events migration's docblock for the full
 * "Webhook Replay Protection" / "Duplicate Callback Protection"
 * rationale. Write-mostly: created once per inbound delivery, then
 * updated exactly once by Actions\ProcessGatewayWebhookAction to record
 * the outcome (`status`, `payment_id`, `processed_at`) of processing that
 * single delivery — never touched again afterward, so a replayed
 * delivery is caught by the unique index before a second update could
 * ever occur.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $gateway_code
 * @property string $event_reference
 * @property string|null $payment_id
 * @property bool $signature_valid
 * @property string $status
 * @property array<string, mixed>|null $payload
 * @property array<string, mixed>|null $headers
 * @property Carbon|null $processed_at
 */
final class PaymentWebhookEvent extends Model
{
    /** @use HasFactory<PaymentWebhookEventFactory> */
    use HasFactory, HasUuids;

    public const UPDATED_AT = null;

    public const string STATUS_RECEIVED = 'received';

    public const string STATUS_PROCESSED = 'processed';

    public const string STATUS_REJECTED = 'rejected';

    public const string STATUS_UNMATCHED = 'unmatched';

    protected $fillable = [
        'gateway_code',
        'event_reference',
        'payment_id',
        'signature_valid',
        'status',
        'payload',
        'headers',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'signature_valid' => 'boolean',
            'payload' => 'array',
            'headers' => 'array',
            'processed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $event): void {
            $event->tenant_id ??= TenantId::DEFAULT;
            $event->status ??= self::STATUS_RECEIVED;
        });
    }

    /**
     * @return PaymentWebhookEventFactory
     */
    protected static function newFactory(): Factory
    {
        return PaymentWebhookEventFactory::new();
    }
}
