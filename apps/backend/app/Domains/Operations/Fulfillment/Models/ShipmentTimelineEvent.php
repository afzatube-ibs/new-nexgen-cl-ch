<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Models;

use Database\Factories\ShipmentTimelineEventFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One entry in a Shipment's business-narrative timeline — see the
 * shipment_timeline_events migration's docblock. Mirrors Orders'
 * OrderTimelineEvent exactly.
 *
 * @property string $id
 * @property string $shipment_id
 * @property string $event_type
 * @property string $description
 * @property Carbon $occurred_at
 */
final class ShipmentTimelineEvent extends Model
{
    /** @use HasFactory<ShipmentTimelineEventFactory> */
    use HasFactory, HasUuids;

    public const string TYPE_SHIPMENT_CREATED = 'shipment_created';

    public const string TYPE_STATUS_CHANGED = 'status_changed';

    public const string TYPE_NOTE_ADDED = 'note_added';

    protected $fillable = [
        'shipment_id',
        'event_type',
        'description',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
        ];
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ShipmentTimelineEventFactory
     */
    protected static function newFactory(): Factory
    {
        return ShipmentTimelineEventFactory::new();
    }

    /**
     * @return BelongsTo<Shipment, $this>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }
}
