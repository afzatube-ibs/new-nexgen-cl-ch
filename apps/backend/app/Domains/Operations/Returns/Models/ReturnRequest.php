<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Models;

use App\Domains\Operations\Returns\Exceptions\InvalidReturnStatusTransitionException;
use App\Domains\Operations\Returns\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ReturnRequestFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * MODULE:RETURNS' aggregate root — see the return_requests migration's
 * docblock for the full rationale behind every cross-module column here
 * being a plain identifier snapshot, never a foreign key.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $order_id
 * @property string $customer_id
 * @property string $rma_number
 * @property string $type
 * @property string $reason
 * @property string|null $reason_details
 * @property string $status
 * @property string|null $resolution
 * @property string|null $resolution_notes
 * @property string|null $rejection_reason
 * @property string|null $pickup_provider_code
 * @property string|null $pickup_tracking_number
 * @property Carbon|null $pickup_scheduled_at
 * @property Carbon|null $received_at
 * @property Carbon|null $inspection_started_at
 * @property Carbon|null $resolved_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $rejected_at
 * @property Carbon|null $cancelled_at
 * @property int $lock_version
 */
final class ReturnRequest extends Model
{
    /** @use HasFactory<ReturnRequestFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string TYPE_RETURN = 'return';

    public const string TYPE_EXCHANGE = 'exchange';

    public const string REASON_DAMAGED = 'damaged';

    public const string REASON_WRONG_ITEM = 'wrong_item';

    public const string REASON_COURIER_DAMAGE = 'courier_damage';

    public const string REASON_DELIVERY_REFUSED = 'delivery_refused';

    public const string REASON_CHANGED_MIND = 'changed_mind';

    public const string REASON_OTHER = 'other';

    public const string STATUS_REQUESTED = 'requested';

    public const string STATUS_APPROVED = 'approved';

    public const string STATUS_PICKUP_SCHEDULED = 'pickup_scheduled';

    public const string STATUS_RECEIVED = 'received';

    public const string STATUS_INSPECTING = 'inspecting';

    public const string STATUS_RESOLUTION_APPROVED = 'resolution_approved';

    public const string STATUS_COMPLETED = 'completed';

    public const string STATUS_REJECTED = 'rejected';

    public const string STATUS_CANCELLED = 'cancelled';

    public const string RESOLUTION_REFUND = 'refund';

    public const string RESOLUTION_EXCHANGE = 'exchange';

    public const string RESOLUTION_REJECT = 'reject';

    /**
     * The Return Status Lifecycle. `rejected` and `cancelled` are
     * terminal — mirrors Fulfillment's Shipment::ALLOWED_TRANSITIONS
     * shape exactly, including the "no fake recovery path" posture: a
     * customer whose rejected return has new grounds files a new request.
     *
     * @var array<string, list<string>>
     */
    private const array ALLOWED_TRANSITIONS = [
        self::STATUS_REQUESTED => [self::STATUS_APPROVED, self::STATUS_REJECTED, self::STATUS_CANCELLED],
        self::STATUS_APPROVED => [self::STATUS_PICKUP_SCHEDULED, self::STATUS_REJECTED, self::STATUS_CANCELLED],
        self::STATUS_PICKUP_SCHEDULED => [self::STATUS_RECEIVED, self::STATUS_REJECTED, self::STATUS_CANCELLED],
        self::STATUS_RECEIVED => [self::STATUS_INSPECTING, self::STATUS_REJECTED],
        self::STATUS_INSPECTING => [self::STATUS_RESOLUTION_APPROVED, self::STATUS_REJECTED],
        self::STATUS_RESOLUTION_APPROVED => [self::STATUS_COMPLETED],
        self::STATUS_COMPLETED => [],
        self::STATUS_REJECTED => [],
        self::STATUS_CANCELLED => [],
    ];

    protected $fillable = [
        'order_id',
        'customer_id',
        'rma_number',
        'type',
        'reason',
        'reason_details',
        'status',
        'resolution',
        'resolution_notes',
        'rejection_reason',
        'pickup_provider_code',
        'pickup_tracking_number',
        'pickup_scheduled_at',
        'received_at',
        'inspection_started_at',
        'resolved_at',
        'completed_at',
        'rejected_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'pickup_scheduled_at' => 'datetime',
            'received_at' => 'datetime',
            'inspection_started_at' => 'datetime',
            'resolved_at' => 'datetime',
            'completed_at' => 'datetime',
            'rejected_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $return): void {
            $return->tenant_id ??= TenantId::DEFAULT;
            $return->type ??= self::TYPE_RETURN;
            $return->status ??= self::STATUS_REQUESTED;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default.
            $return->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ReturnRequestFactory
     */
    protected static function newFactory(): Factory
    {
        return ReturnRequestFactory::new();
    }

    /**
     * @throws InvalidReturnStatusTransitionException
     */
    public function assertCanTransitionTo(string $target): void
    {
        if (! in_array($target, self::ALLOWED_TRANSITIONS[$this->status] ?? [], true)) {
            throw new InvalidReturnStatusTransitionException($this->id, $this->status, $target);
        }
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_REJECTED, self::STATUS_CANCELLED], true);
    }

    public function isExchange(): bool
    {
        return $this->type === self::TYPE_EXCHANGE;
    }

    /**
     * @return HasMany<ReturnRequestItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(ReturnRequestItem::class);
    }

    /**
     * @return HasMany<ReturnTimelineEvent, $this>
     */
    public function timelineEvents(): HasMany
    {
        return $this->hasMany(ReturnTimelineEvent::class)->orderBy('occurred_at');
    }

    /**
     * @return HasMany<ReturnNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(ReturnNote::class)->orderByDesc('created_at');
    }

    /**
     * @return HasOne<RefundRequest, $this>
     */
    public function refundRequest(): HasOne
    {
        return $this->hasOne(RefundRequest::class);
    }

    /**
     * @return HasOne<ExchangeRequest, $this>
     */
    public function exchangeRequest(): HasOne
    {
        return $this->hasOne(ExchangeRequest::class);
    }
}
