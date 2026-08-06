<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Models;

use Database\Factories\ReturnTimelineEventFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One entry in a ReturnRequest's business-narrative timeline — mirrors
 * Orders' OrderTimelineEvent and Fulfillment's ShipmentTimelineEvent
 * exactly.
 *
 * @property string $id
 * @property string $return_request_id
 * @property string $event_type
 * @property string $description
 * @property Carbon $occurred_at
 */
final class ReturnTimelineEvent extends Model
{
    /** @use HasFactory<ReturnTimelineEventFactory> */
    use HasFactory, HasUuids;

    public const string TYPE_RETURN_REQUESTED = 'return_requested';

    public const string TYPE_STATUS_CHANGED = 'status_changed';

    public const string TYPE_NOTE_ADDED = 'note_added';

    protected $fillable = [
        'return_request_id',
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
     * @return ReturnTimelineEventFactory
     */
    protected static function newFactory(): Factory
    {
        return ReturnTimelineEventFactory::new();
    }

    /**
     * @return BelongsTo<ReturnRequest, $this>
     */
    public function returnRequest(): BelongsTo
    {
        return $this->belongsTo(ReturnRequest::class);
    }
}
