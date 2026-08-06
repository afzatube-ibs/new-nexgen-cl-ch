<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Models;

use App\Domains\Operations\Returns\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\RefundRequestFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * An independent aggregate root — see the refund_requests migration's
 * docblock for the full DDD rationale (its own consistency boundary,
 * distinct from ReturnRequest's).
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $return_request_id
 * @property string $payment_id
 * @property string $amount
 * @property string $currency_code
 * @property string $status
 * @property string|null $gateway_reference
 * @property string|null $failure_reason
 * @property Carbon $requested_at
 * @property Carbon|null $completed_at
 * @property int $lock_version
 */
final class RefundRequest extends Model
{
    /** @use HasFactory<RefundRequestFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids;

    public const string STATUS_PENDING = 'pending';

    public const string STATUS_PROCESSING = 'processing';

    public const string STATUS_COMPLETED = 'completed';

    public const string STATUS_FAILED = 'failed';

    /**
     * @var array<string, list<string>>
     */
    private const array TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_PROCESSING, self::STATUS_FAILED],
        self::STATUS_PROCESSING => [self::STATUS_COMPLETED, self::STATUS_FAILED],
        self::STATUS_COMPLETED => [],
        self::STATUS_FAILED => [self::STATUS_PROCESSING],
    ];

    protected $fillable = [
        'return_request_id',
        'payment_id',
        'amount',
        'currency_code',
        'status',
        'gateway_reference',
        'failure_reason',
        'requested_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $refund): void {
            $refund->tenant_id ??= TenantId::DEFAULT;
            $refund->status ??= self::STATUS_PENDING;
            $refund->requested_at ??= now();
            $refund->currency_code = strtoupper((string) $refund->currency_code);
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default.
            $refund->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return RefundRequestFactory
     */
    protected static function newFactory(): Factory
    {
        return RefundRequestFactory::new();
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    public function isTerminal(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * @return BelongsTo<ReturnRequest, $this>
     */
    public function returnRequest(): BelongsTo
    {
        return $this->belongsTo(ReturnRequest::class);
    }
}
