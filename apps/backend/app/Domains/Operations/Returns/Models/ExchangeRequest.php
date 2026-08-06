<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Models;

use App\Domains\Operations\Returns\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ExchangeRequestFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * An independent aggregate root — see the exchange_requests migration's
 * docblock, including its deliberately basic, Phase-1-scoped shape
 * (no inventory reservation, no automatic Fulfillment shipment).
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $return_request_id
 * @property string $desired_sku
 * @property string|null $desired_description
 * @property int $desired_quantity
 * @property string $status
 * @property string|null $tracking_number
 * @property Carbon|null $completed_at
 * @property int $lock_version
 */
final class ExchangeRequest extends Model
{
    /** @use HasFactory<ExchangeRequestFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids;

    public const string STATUS_PENDING = 'pending';

    public const string STATUS_PREPARING = 'preparing';

    public const string STATUS_SHIPPED = 'shipped';

    public const string STATUS_COMPLETED = 'completed';

    public const string STATUS_CANCELLED = 'cancelled';

    /**
     * @var array<string, list<string>>
     */
    private const array TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_PREPARING, self::STATUS_CANCELLED],
        self::STATUS_PREPARING => [self::STATUS_SHIPPED, self::STATUS_CANCELLED],
        self::STATUS_SHIPPED => [self::STATUS_COMPLETED],
        self::STATUS_COMPLETED => [],
        self::STATUS_CANCELLED => [],
    ];

    protected $fillable = [
        'return_request_id',
        'desired_sku',
        'desired_description',
        'desired_quantity',
        'status',
        'tracking_number',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'desired_quantity' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $exchange): void {
            $exchange->tenant_id ??= TenantId::DEFAULT;
            $exchange->status ??= self::STATUS_PENDING;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default.
            $exchange->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ExchangeRequestFactory
     */
    protected static function newFactory(): Factory
    {
        return ExchangeRequestFactory::new();
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    /**
     * @return BelongsTo<ReturnRequest, $this>
     */
    public function returnRequest(): BelongsTo
    {
        return $this->belongsTo(ReturnRequest::class);
    }
}
