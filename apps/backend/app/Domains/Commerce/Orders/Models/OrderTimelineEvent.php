<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Models;

use Database\Factories\OrderTimelineEventFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One entry in an Order's business-narrative timeline — see the
 * order_timeline_events migration's docblock.
 *
 * @property string $id
 * @property string $order_id
 * @property string $event_type
 * @property string $description
 * @property Carbon $occurred_at
 */
final class OrderTimelineEvent extends Model
{
    /** @use HasFactory<OrderTimelineEventFactory> */
    use HasFactory, HasUuids;

    public const string TYPE_ORDER_PLACED = 'order_placed';

    public const string TYPE_STATUS_CHANGED = 'status_changed';

    public const string TYPE_NOTE_ADDED = 'note_added';

    protected $fillable = [
        'order_id',
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
     * @return OrderTimelineEventFactory
     */
    protected static function newFactory(): Factory
    {
        return OrderTimelineEventFactory::new();
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
