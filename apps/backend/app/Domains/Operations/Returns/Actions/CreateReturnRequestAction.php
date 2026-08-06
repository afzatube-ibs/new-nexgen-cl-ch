<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Events\ReturnRequested;
use App\Domains\Operations\Returns\Exceptions\ReturnValidationException;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use App\Domains\Operations\Returns\Support\RmaNumberGenerator;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * MODULE:RETURNS' "Return/exchange request" Public Contract — the
 * customer- or operator-initiated entry point, per the master plan's own
 * "Public Contracts: Return/exchange request, status query." This module
 * has no automatic OrderPlaced-style reaction (unlike Fulfillment): a
 * return is filed after delivery, on the customer's or an operator's own
 * initiative, never triggered by an upstream event — order_id/customer_id
 * are supplied directly by the caller, exactly like Fulfillment's own
 * manual creation path, since Returns has no lawful way to read Orders'
 * data directly either way (this module's own acceptance criterion:
 * "does not directly depend on Commerce modules").
 *
 * @see ReturnRequest for why `items` is required — at least one SKU must
 *      be named for a return to mean anything.
 */
final readonly class CreateReturnRequestAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
        private RmaNumberGenerator $rmaNumberGenerator,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<array{sku: string, description?: string|null, quantity: int}>  $items
     */
    public function execute(array $attributes, array $items, ?string $actorId): ReturnRequest
    {
        if ($items === []) {
            throw new ReturnValidationException('no_items', 'A return request must name at least one item.');
        }

        return DB::transaction(function () use ($attributes, $items, $actorId) {
            $returnRequest = ReturnRequest::query()->create([
                'order_id' => $attributes['order_id'],
                'customer_id' => $attributes['customer_id'],
                'rma_number' => $this->rmaNumberGenerator->generate(),
                'type' => $attributes['type'] ?? ReturnRequest::TYPE_RETURN,
                'reason' => $attributes['reason'],
                'reason_details' => $attributes['reason_details'] ?? null,
            ]);

            foreach ($items as $item) {
                $returnRequest->items()->create([
                    'sku' => $item['sku'],
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                ]);
            }

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_RETURN_REQUESTED,
                'description' => "Return requested for order {$returnRequest->order_id} ({$returnRequest->rma_number}).",
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'return_request.created',
                actorId: $actorId,
                targetType: ReturnRequest::class,
                targetId: $returnRequest->id,
                after: $returnRequest->only(['order_id', 'customer_id', 'rma_number', 'type', 'reason', 'status']),
            );

            $this->eventBus->publish(new ReturnRequested(
                returnRequestId: $returnRequest->id,
                orderId: $returnRequest->order_id,
                customerId: $returnRequest->customer_id,
                rmaNumber: $returnRequest->rma_number,
                type: $returnRequest->type,
            ));

            return $returnRequest;
        });
    }
}
