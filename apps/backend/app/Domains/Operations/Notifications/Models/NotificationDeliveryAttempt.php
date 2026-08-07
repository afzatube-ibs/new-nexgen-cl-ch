<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Models;

use Database\Factories\NotificationDeliveryAttemptFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One row in a Notification's append-only delivery ledger — see the
 * notification_delivery_attempts migration's own docblock. Mirrors
 * Payments' PaymentAttempt exactly.
 *
 * @property string $id
 * @property string $notification_id
 * @property string $provider_code
 * @property string $status
 * @property string|null $provider_reference
 * @property array<string, mixed>|null $request_payload
 * @property array<string, mixed>|null $response_payload
 * @property string|null $failure_reason
 * @property Carbon $occurred_at
 */
final class NotificationDeliveryAttempt extends Model
{
    /** @use HasFactory<NotificationDeliveryAttemptFactory> */
    use HasFactory, HasUuids;

    public const UPDATED_AT = null;

    public const string STATUS_SUCCEEDED = 'succeeded';

    public const string STATUS_FAILED = 'failed';

    protected $fillable = [
        'notification_id',
        'provider_code',
        'status',
        'provider_reference',
        'request_payload',
        'response_payload',
        'failure_reason',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'request_payload' => 'array',
            'response_payload' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return NotificationDeliveryAttemptFactory
     */
    protected static function newFactory(): Factory
    {
        return NotificationDeliveryAttemptFactory::new();
    }

    /**
     * @return BelongsTo<Notification, $this>
     */
    public function notification(): BelongsTo
    {
        return $this->belongsTo(Notification::class);
    }
}
