<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Models;

use App\Domains\Commerce\Orders\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * MODULE:ORDERS' aggregate root — see the orders migration's docblock for
 * the full field-by-field rationale, including why this carries no
 * soft-delete column.
 *
 * "Order status lifecycle": a one-directional graph with a single early
 * exit —
 *
 *   pending -> confirmed -> processing -> shipped -> delivered
 *      \            \            /
 *       -------------> cancelled
 *
 * `delivered` and `cancelled` are terminal. Refunds are deliberately out
 * of scope for this module — planning/IMPLEMENTATION_MASTER_PLAN.md lists
 * "Returns" as its own future Evolvable module (docs/04_MODULE_
 * ARCHITECTURE.md's Evolvable list), so this status graph does not invent
 * a `refunded` state that module would need to inherit or redesign around;
 * it narrows a designed-in dimension (order status) rather than requiring
 * one, per this project's usual Future Extension Points discipline.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $order_number
 * @property string $customer_id
 * @property string $customer_name
 * @property string $customer_email
 * @property string|null $customer_phone
 * @property string $currency_code
 * @property string $subtotal
 * @property string $discount_total
 * @property string $tax_total
 * @property string $shipping_total
 * @property string $grand_total
 * @property string $status
 * @property Carbon $placed_at
 * @property int $lock_version
 */
final class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids;

    public const string STATUS_PENDING = 'pending';

    public const string STATUS_CONFIRMED = 'confirmed';

    public const string STATUS_PROCESSING = 'processing';

    public const string STATUS_SHIPPED = 'shipped';

    public const string STATUS_DELIVERED = 'delivered';

    public const string STATUS_CANCELLED = 'cancelled';

    /**
     * @var array<string, list<string>>
     */
    private const array TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_CONFIRMED, self::STATUS_CANCELLED],
        self::STATUS_CONFIRMED => [self::STATUS_PROCESSING, self::STATUS_CANCELLED],
        self::STATUS_PROCESSING => [self::STATUS_SHIPPED, self::STATUS_CANCELLED],
        self::STATUS_SHIPPED => [self::STATUS_DELIVERED],
        self::STATUS_DELIVERED => [],
        self::STATUS_CANCELLED => [],
    ];

    protected $fillable = [
        'order_number',
        'customer_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'currency_code',
        'subtotal',
        'discount_total',
        'tax_total',
        'shipping_total',
        'grand_total',
        'status',
        'placed_at',
    ];

    protected function casts(): array
    {
        return [
            // Matches the migration's own `decimal('*_total'/'grand_total',
            // 14, 4)` — without these, SQLite's NUMERIC affinity returns a
            // whole-number total as a PHP int (not a decimal string), the
            // same recurring bug class already found and fixed on
            // `PriceListEntry`/`TaxRate`, `CheckoutSession`/`CheckoutItem`,
            // and `RefundRequest` earlier this engagement — found here, on
            // the platform's own central financial model, while building
            // Milestone 8's revenue dashboard widgets.
            'subtotal' => 'decimal:4',
            'discount_total' => 'decimal:4',
            'tax_total' => 'decimal:4',
            'shipping_total' => 'decimal:4',
            'grand_total' => 'decimal:4',
            'placed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $order): void {
            $order->tenant_id ??= TenantId::DEFAULT;
            $order->status ??= self::STATUS_PENDING;
            $order->placed_at ??= now();
            $order->order_number ??= self::generateOrderNumber();
            $order->currency_code = strtoupper((string) $order->currency_code);
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $order->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $order->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return OrderFactory
     */
    protected static function newFactory(): Factory
    {
        return OrderFactory::new();
    }

    /**
     * A human-readable identifier distinct from `id`, derived from a
     * fresh UUID rather than a shared counter — collision-free without
     * needing a locked sequence table, and the `order_number` column's
     * own unique index is the actual enforcement backstop, consistent
     * with how uniqueness is enforced everywhere else in this project.
     */
    public static function generateOrderNumber(): string
    {
        return 'ORD-'.now()->format('Ymd').'-'.strtoupper(substr(str_replace('-', '', (string) Str::uuid()), 0, 8));
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    public function isTerminal(): bool
    {
        return (self::TRANSITIONS[$this->status] ?? []) === [];
    }

    public function touchAggregateVersion(): void
    {
        $this->lock_version++;
        $this->save();
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasMany<OrderAddress, $this>
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(OrderAddress::class);
    }

    /**
     * @return HasMany<OrderDiscount, $this>
     */
    public function discounts(): HasMany
    {
        return $this->hasMany(OrderDiscount::class);
    }

    /**
     * @return HasMany<OrderNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(OrderNote::class);
    }

    /**
     * @return HasMany<OrderTimelineEvent, $this>
     */
    public function timelineEvents(): HasMany
    {
        return $this->hasMany(OrderTimelineEvent::class);
    }
}
