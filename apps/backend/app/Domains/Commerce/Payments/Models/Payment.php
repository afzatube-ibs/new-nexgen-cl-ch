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
 *   pending -> authorized -> captured -> partially_refunded -> refunded
 *      \            \             \______________________________/
 *       ------------> failed / cancelled / voided
 *
 * `captured` was originally this aggregate's one success terminal state;
 * `partially_refunded`/`refunded` are additive exits from it, added when
 * the Returns module (`MODULE:RETURNS`) was built — see Actions\
 * RefundPaymentAction's docblock and the payments migration that added
 * `amount_refunded`/`refunded_at`. Cash On Delivery's own "Confirmed"
 * vocabulary and Bank Transfer's "Approved" vocabulary both still map onto
 * `captured`; neither gateway invents a parallel status this aggregate,
 * or any caller outside its own gateway class, would need to special-case.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $order_id
 * @property string|null $customer_id
 * @property string $gateway_code
 * @property string $currency_code
 * @property string $amount
 * @property string $amount_captured
 * @property string $amount_refunded
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
 * @property Carbon|null $refunded_at
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

    public const string STATUS_PARTIALLY_REFUNDED = 'partially_refunded';

    public const string STATUS_REFUNDED = 'refunded';

    /**
     * @var array<string, list<string>>
     */
    private const array TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_AUTHORIZED, self::STATUS_CAPTURED, self::STATUS_FAILED, self::STATUS_CANCELLED],
        self::STATUS_AUTHORIZED => [self::STATUS_CAPTURED, self::STATUS_VOIDED, self::STATUS_FAILED, self::STATUS_CANCELLED],
        self::STATUS_CAPTURED => [self::STATUS_PARTIALLY_REFUNDED, self::STATUS_REFUNDED],
        self::STATUS_PARTIALLY_REFUNDED => [self::STATUS_PARTIALLY_REFUNDED, self::STATUS_REFUNDED],
        self::STATUS_REFUNDED => [],
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
        'amount_refunded',
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
        'refunded_at',
    ];

    protected function casts(): array
    {
        return [
            // `decimal:4` matches this table's own `decimal(14,4)` columns
            // (`database/migrations/2026_08_05_210001_create_payments_table.php`,
            // `2026_08_08_000001_add_refund_columns_to_payments_table.php`) and
            // this class's own documented `@property string` type above.
            // Genuine bug fix, not a contract change: without this cast, a
            // whole-number amount comes back from SQLite as a PHP `int`
            // (or a non-whole one as `float`) instead of the `string` every
            // caller — `Actions\CapturePaymentAction`, `Events\
            // PaymentInitiated`, this module's entire JSON API — already
            // requires, throwing a `TypeError` on the very first capture of
            // any such payment (confirmed via `POST /payments/{id}/capture`
            // against a real dev payment during Phase 2.9 Slice 2's own live
            // verification). MySQL/PostgreSQL's own PDO drivers already
            // return decimal columns as strings, so this was masked there;
            // SQLite does not, so this cast makes both drivers agree,
            // exactly matching PaymentAttempt's own equivalent fix below.
            'amount' => 'decimal:4',
            'amount_captured' => 'decimal:4',
            'amount_refunded' => 'decimal:4',
            'initiated_at' => 'datetime',
            'authorized_at' => 'datetime',
            'captured_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'failed_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $payment): void {
            $payment->tenant_id ??= TenantId::DEFAULT;
            $payment->status ??= self::STATUS_PENDING;
            $payment->amount_captured ??= '0.0000';
            $payment->amount_refunded ??= '0.0000';
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
