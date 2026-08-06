<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\PaymentAttemptFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * See the payment_attempts migration's docblock for why this table merges
 * "Payment Transactions" and "Payment Attempts" into one append-only
 * ledger. Write-once: no `lock_version`, no update path anywhere in this
 * module.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $payment_id
 * @property string $type
 * @property string $status
 * @property string $gateway_code
 * @property string|null $gateway_reference
 * @property string|null $amount
 * @property string|null $currency_code
 * @property array<string, mixed>|null $request_payload
 * @property array<string, mixed>|null $response_payload
 * @property string|null $failure_reason
 * @property Carbon $occurred_at
 */
final class PaymentAttempt extends Model
{
    /** @use HasFactory<PaymentAttemptFactory> */
    use HasFactory, HasUuids;

    public const UPDATED_AT = null;

    public const string TYPE_INITIATION = 'initiation';

    public const string TYPE_AUTHORIZATION = 'authorization';

    public const string TYPE_CAPTURE = 'capture';

    public const string TYPE_CANCELLATION = 'cancellation';

    public const string TYPE_VOID = 'void';

    public const string TYPE_FAILURE = 'failure';

    public const string TYPE_WEBHOOK = 'webhook';

    public const string TYPE_REFUND = 'refund';

    public const string STATUS_PENDING = 'pending';

    public const string STATUS_SUCCEEDED = 'succeeded';

    public const string STATUS_FAILED = 'failed';

    protected $fillable = [
        'payment_id',
        'type',
        'status',
        'gateway_code',
        'gateway_reference',
        'amount',
        'currency_code',
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

    protected static function booted(): void
    {
        self::creating(function (self $attempt): void {
            $attempt->tenant_id ??= TenantId::DEFAULT;
            $attempt->occurred_at ??= now();

            if ($attempt->currency_code !== null) {
                $attempt->currency_code = strtoupper($attempt->currency_code);
            }
        });
    }

    /**
     * @return PaymentAttemptFactory
     */
    protected static function newFactory(): Factory
    {
        return PaymentAttemptFactory::new();
    }

    /**
     * @return BelongsTo<Payment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}
