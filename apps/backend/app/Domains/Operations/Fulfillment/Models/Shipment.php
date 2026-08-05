<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Models;

use App\Domains\Operations\Fulfillment\Exceptions\InvalidShipmentStatusTransitionException;
use App\Domains\Operations\Fulfillment\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ShipmentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * MODULE:FULFILLMENT's aggregate root — see the shipments migration's
 * docblock for the full rationale behind every cross-module column here
 * being a plain identifier snapshot, never a foreign key.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $order_id
 * @property string $order_number
 * @property string $customer_id
 * @property string|null $grand_total
 * @property string|null $currency_code
 * @property string|null $shipping_method_id
 * @property string|null $courier_provider_code
 * @property string|null $courier_consignment_id
 * @property string|null $tracking_number
 * @property string|null $label_url
 * @property string|null $destination_recipient_name
 * @property string|null $destination_phone
 * @property string|null $destination_address_line1
 * @property string|null $destination_address_line2
 * @property string|null $destination_city
 * @property string|null $destination_region
 * @property string|null $destination_postal_code
 * @property string|null $destination_country_code
 * @property int|null $weight_grams
 * @property string $status
 * @property string|null $failure_reason
 * @property Carbon|null $picked_at
 * @property Carbon|null $packed_at
 * @property Carbon|null $dispatched_at
 * @property Carbon|null $delivered_at
 * @property int $lock_version
 */
final class Shipment extends Model
{
    /** @use HasFactory<ShipmentFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_PENDING = 'pending';

    public const string STATUS_PICKING = 'picking';

    public const string STATUS_PICKED = 'picked';

    public const string STATUS_PACKING = 'packing';

    public const string STATUS_PACKED = 'packed';

    public const string STATUS_DISPATCHED = 'dispatched';

    public const string STATUS_IN_TRANSIT = 'in_transit';

    public const string STATUS_DELIVERED = 'delivered';

    public const string STATUS_FAILED = 'failed';

    public const string STATUS_CANCELLED = 'cancelled';

    /**
     * The Shipment Status Lifecycle — mirrors the shape of Orders' own
     * $allowedTransitions map exactly (see that model's docblock).
     * `failed` and `cancelled` are terminal, matching this module's
     * "no fake recovery path" posture: a failed or cancelled shipment is
     * re-fulfilled by creating a new one via Actions\CreateShipmentAction,
     * never by resurrecting this record.
     *
     * @var array<string, list<string>>
     */
    private const array ALLOWED_TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_PICKING, self::STATUS_CANCELLED],
        self::STATUS_PICKING => [self::STATUS_PICKED, self::STATUS_FAILED, self::STATUS_CANCELLED],
        self::STATUS_PICKED => [self::STATUS_PACKING, self::STATUS_CANCELLED],
        self::STATUS_PACKING => [self::STATUS_PACKED, self::STATUS_FAILED, self::STATUS_CANCELLED],
        self::STATUS_PACKED => [self::STATUS_DISPATCHED, self::STATUS_CANCELLED],
        self::STATUS_DISPATCHED => [self::STATUS_IN_TRANSIT, self::STATUS_DELIVERED, self::STATUS_FAILED],
        self::STATUS_IN_TRANSIT => [self::STATUS_DELIVERED, self::STATUS_FAILED],
        self::STATUS_DELIVERED => [],
        self::STATUS_FAILED => [],
        self::STATUS_CANCELLED => [],
    ];

    protected $fillable = [
        'order_id',
        'order_number',
        'customer_id',
        'grand_total',
        'currency_code',
        'shipping_method_id',
        'courier_provider_code',
        'courier_consignment_id',
        'tracking_number',
        'label_url',
        'destination_recipient_name',
        'destination_phone',
        'destination_address_line1',
        'destination_address_line2',
        'destination_city',
        'destination_region',
        'destination_postal_code',
        'destination_country_code',
        'weight_grams',
        'status',
        'failure_reason',
        'picked_at',
        'packed_at',
        'dispatched_at',
        'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            // Explicit 'decimal:4' rather than leaving this uncast: without
            // it, a freshly-created (not yet re-fetched from the database)
            // Shipment instance carries whatever PHP type its caller
            // assigned (a factory's fake()->randomFloat(), in particular) —
            // Actions\DispatchShipmentAction passes this value on to
            // Couriers\Support\ShipmentBookingRequest's strictly-typed
            // `string $codAmount`, so a raw float here would be a real
            // TypeError, not just a style inconsistency.
            'grand_total' => 'decimal:4',
            'weight_grams' => 'integer',
            'picked_at' => 'datetime',
            'packed_at' => 'datetime',
            'dispatched_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $shipment): void {
            $shipment->tenant_id ??= TenantId::DEFAULT;
            $shipment->status ??= self::STATUS_PENDING;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $shipment->lock_version
            // immediately after creation would otherwise see null instead
            // of 1.
            $shipment->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ShipmentFactory
     */
    protected static function newFactory(): Factory
    {
        return ShipmentFactory::new();
    }

    /**
     * @throws InvalidShipmentStatusTransitionException
     */
    public function assertCanTransitionTo(string $target): void
    {
        if (! in_array($target, self::ALLOWED_TRANSITIONS[$this->status] ?? [], true)) {
            throw new InvalidShipmentStatusTransitionException($this->id, $this->status, $target);
        }
    }

    public function hasDestination(): bool
    {
        return filled($this->destination_recipient_name)
            && filled($this->destination_phone)
            && filled($this->destination_address_line1)
            && filled($this->destination_city)
            && filled($this->destination_country_code);
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_DELIVERED, self::STATUS_FAILED, self::STATUS_CANCELLED], true);
    }

    /**
     * @return HasMany<ShipmentItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(ShipmentItem::class);
    }

    /**
     * @return HasMany<ShipmentTimelineEvent, $this>
     */
    public function timelineEvents(): HasMany
    {
        return $this->hasMany(ShipmentTimelineEvent::class)->orderBy('occurred_at');
    }

    /**
     * @return HasMany<ShipmentNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(ShipmentNote::class)->orderByDesc('created_at');
    }
}
