<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Models;

use App\Domains\Commerce\Payments\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * MODULE:PAYMENTS' aggregate root — see the payments migration's docblock
 * for the full field-by-field rationale, including why an Order may have
 * many Payment rows but never more than one concurrently active.
 *
 * "Payment status lifecycle":
 *
 *   pending -> authorized -> captured
 *      \            \
 *       ------------> failed / cancelled / voided
 *
 * `captured` is the one success terminal state, shared by every gateway
 * this module integrates with — Cash On Delivery's own "Confirmed"
 * vocabulary and Bank Transfer's "Approved" vocabulary both map onto
 * `captured` (see Actions\CapturePaymentAction's docblock); neither
 * invents a parallel status this aggregate, or any caller outside its own
 * gateway class, would need to special-case.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $order_id
 * @property string|null $customer_id
 * @property string $gateway_code
 * @property string $currency_code
 * @property string $amount
 * @property string $amount_captured
 * @property string $status
 * @property string|null $idempotency_key
 * @property string|null $proof_reference
 * @property string|null $redirect_url
 * @property string|null $instructions
 * @property string|null $failure_reason
 * @property Carbon $initiated_at
 * @property Carbon|null $authorized_at
 * @property Carbon|null $captured_at
 * @property Carbon|null $cancelled_at
 * @property Carbon|null $failed_at
 * @property int $lock_version
 */
final class Payment extends Model
{
    /** @use HasFactory<PaymentFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids;

    public const string STATUS_PENDING = 'pending';

    public const string STATUS_AUTHORIZED = 'authorized';

    public const string STATUS_CAPTURED = 'captured';

    public const string STATUS_FAILED = 'failed';

    public const string STATUS_CANCELLED = 'cancelled';

    public const string STATUS_VOIDED = 'voided';

    /**
     * @var array<string, list<string>>
     */
    private const array TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_AUTHORIZED, self::STATUS_CAPTURED, self::STATUS_FAILED, self::STATUS_CANCELLED],
        self::STATUS_AUTHORIZED => [self::STATUS_CAPTURED, self::STATUS_VOIDED, self::STATUS_FAILED, self::STATUS_CANCELLED],
        self::STATUS_CAPTURED => [],
        self::STATUS_FAILED => [],
        self::STATUS_CANCELLED => [],
        self::STATUS_VOIDED => [],
    ];

    protected $fillable = [
        'order_id',
        'customer_id',
        'gateway_code',
        'currency_code',
        'amount',
        'amount_captured',
        'status',
        'idempotency_key',
        'proof_reference',
        'redirect_url',
        'instructions',
        'failure_reason',
        'initiated_at',
        'authorized_at',
        'captured_at',
        'cancelled_at',
        'failed_at',
    ];

    protected function casts(): array
    {
        return [
            'initiated_at' => 'datetime',
            'authorized_at' => 'datetime',
            'captured_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $payment): void {
            $payment->tenant_id ??= TenantId::DEFAULT;
            $payment->status ??= self::STATUS_PENDING;
            $payment->amount_captured ??= '0.0000';
            $payment->initiated_at ??= now();
            $payment->currency_code = strtoupper((string) $payment->currency_code);
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default.
            $payment->lock_version ??= 1;
        });
    }

    /**
     * @return PaymentFactory
     */
    protected static function newFactory(): Factory
    {
        return PaymentFactory::new();
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    public function isTerminal(): bool
    {
        return (self::TRANSITIONS[$this->status] ?? []) === [];
    }

    /**
     * Whether this payment currently occupies the one "active" slot an
     * Order is permitted per the payments migration's docblock —
     * consulted by Actions\InitiatePaymentAction under a row lock before
     * a new Payment is created for the same order.
     */
    public function isActive(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_AUTHORIZED], true);
    }

    public function touchAggregateVersion(): void
    {
        $this->lock_version++;
        $this->save();
    }

    /**
     * @return HasMany<PaymentAttempt, $this>
     */
    public function attempts(): HasMany
    {
        return $this->hasMany(PaymentAttempt::class);
    }
}
