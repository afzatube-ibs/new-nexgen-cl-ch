<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Actions;

use App\Domains\Commerce\Orders\Audit\AuditLogger;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderNote;
use App\Domains\Commerce\Orders\Models\OrderTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * "Order notes" — adds an append-only annotation to an Order. Requires
 * the order's current `expected_version`, mirroring Customers'
 * AddCustomerAddressAction and Promotions' AddPromotionConditionAction
 * exactly: a note is a mutation of the aggregate, versioned through the
 * root, even though it touches no column on the `orders` row itself.
 */
final readonly class AddOrderNoteAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Order $order, string $body, bool $isCustomerVisible, int $expectedVersion, ?string $actorId): OrderNote
    {
        return DB::transaction(function () use ($order, $body, $isCustomerVisible, $expectedVersion, $actorId) {
            $order->assertVersionMatches($expectedVersion);

            $note = $order->notes()->create([
                'author_id' => $actorId,
                'body' => $body,
                'is_customer_visible' => $isCustomerVisible,
            ]);

            $order->touchAggregateVersion();

            $order->timelineEvents()->create([
                'event_type' => OrderTimelineEvent::TYPE_NOTE_ADDED,
                'description' => 'A note was added to this order.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'order.note_added',
                actorId: $actorId,
                targetType: OrderNote::class,
                targetId: $note->id,
                after: $note->only(['order_id', 'body', 'is_customer_visible']),
            );

            return $note;
        });
    }
}
