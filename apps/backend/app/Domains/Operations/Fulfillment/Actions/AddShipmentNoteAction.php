<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentNote;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Support\Facades\DB;

final readonly class AddShipmentNoteAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, string $body, bool $isCustomerVisible, ?string $actorId): ShipmentNote
    {
        return DB::transaction(function () use ($shipment, $body, $isCustomerVisible, $actorId) {
            $note = $shipment->notes()->create([
                'author_id' => $actorId,
                'body' => $body,
                'is_customer_visible' => $isCustomerVisible,
            ]);

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_NOTE_ADDED,
                'description' => 'A note was added.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'shipment_note.added',
                actorId: $actorId,
                targetType: ShipmentNote::class,
                targetId: $note->id,
                after: $note->only(['shipment_id', 'body', 'is_customer_visible']),
            );

            return $note;
        });
    }
}
