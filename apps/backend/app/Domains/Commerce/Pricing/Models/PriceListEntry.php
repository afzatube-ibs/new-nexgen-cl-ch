<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Models;

use App\Domains\Commerce\Pricing\Models\Concerns\HasOptimisticLocking;
use Carbon\CarbonImmutable;
use Database\Factories\PriceListEntryFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * One SKU's pricing within a PriceList — see the price_list_entries
 * migration's docblock for the full rationale, including why this carries
 * its own `lock_version` rather than being versioned through PriceList.
 *
 * @property string $id
 * @property string $price_list_id
 * @property string $sku
 * @property string $base_price
 * @property string|null $compare_at_price
 * @property string|null $sale_price
 * @property Carbon|null $sale_starts_at
 * @property Carbon|null $sale_ends_at
 * @property int $lock_version
 */
final class PriceListEntry extends Model
{
    /** @use HasFactory<PriceListEntryFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    protected $fillable = [
        'price_list_id',
        'sku',
        'base_price',
        'compare_at_price',
        'sale_price',
        'sale_starts_at',
        'sale_ends_at',
    ];

    protected function casts(): array
    {
        return [
            'sale_starts_at' => 'datetime',
            'sale_ends_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $entry): void {
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $entry->lock_version immediately
            // after creation would otherwise see null instead of 1.
            $entry->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return PriceListEntryFactory
     */
    protected static function newFactory(): Factory
    {
        return PriceListEntryFactory::new();
    }

    /**
     * The price a caller actually pays right now: the sale price, if one
     * is set and the current moment falls within its (optional, open-
     * ended) schedule window — otherwise the standing base price. This is
     * "Scheduled Pricing" resolved, per planning/IMPLEMENTATION_MASTER_
     * PLAN.md's Pricing & Tax entry.
     */
    public function effectivePrice(): string
    {
        return $this->isSaleActive() ? (string) $this->sale_price : $this->base_price;
    }

    public function isSaleActive(): bool
    {
        if ($this->sale_price === null) {
            return false;
        }

        $now = CarbonImmutable::now();

        if ($this->sale_starts_at !== null && $now->lt($this->sale_starts_at)) {
            return false;
        }

        if ($this->sale_ends_at !== null && $now->gt($this->sale_ends_at)) {
            return false;
        }

        return true;
    }

    /**
     * @return BelongsTo<PriceList, $this>
     */
    public function priceList(): BelongsTo
    {
        return $this->belongsTo(PriceList::class);
    }
}
