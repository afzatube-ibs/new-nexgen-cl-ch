<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Models;

use Database\Factories\ShipmentNoteFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An append-only annotation on a Shipment — see the shipment_notes
 * migration's docblock. Mirrors Orders' OrderNote exactly.
 *
 * @property string $id
 * @property string $shipment_id
 * @property string|null $author_id
 * @property string $body
 * @property bool $is_customer_visible
 */
final class ShipmentNote extends Model
{
    /** @use HasFactory<ShipmentNoteFactory> */
    use HasFactory, HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = [
        'shipment_id',
        'author_id',
        'body',
        'is_customer_visible',
    ];

    protected function casts(): array
    {
        return [
            'is_customer_visible' => 'boolean',
        ];
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ShipmentNoteFactory
     */
    protected static function newFactory(): Factory
    {
        return ShipmentNoteFactory::new();
    }

    /**
     * @return BelongsTo<Shipment, $this>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }
}
