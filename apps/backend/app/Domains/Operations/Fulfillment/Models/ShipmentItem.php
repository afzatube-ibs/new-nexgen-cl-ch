<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ShipmentItemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A line item within a Shipment — see the shipment_items migration's
 * docblock, including why `sku` is a plain string, never a Catalog
 * foreign key.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $shipment_id
 * @property string $sku
 * @property string|null $description
 * @property int $quantity
 */
final class ShipmentItem extends Model
{
    /** @use HasFactory<ShipmentItemFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'shipment_id',
        'sku',
        'description',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $item): void {
            $item->tenant_id ??= TenantId::DEFAULT;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ShipmentItemFactory
     */
    protected static function newFactory(): Factory
    {
        return ShipmentItemFactory::new();
    }

    /**
     * @return BelongsTo<Shipment, $this>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }
}
