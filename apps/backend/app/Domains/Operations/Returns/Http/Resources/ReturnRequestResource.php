<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Resources;

use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReturnRequest
 */
final class ReturnRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderId' => $this->order_id,
            'customerId' => $this->customer_id,
            'rmaNumber' => $this->rma_number,
            'type' => $this->type,
            'reason' => $this->reason,
            'reasonDetails' => $this->reason_details,
            'status' => $this->status,
            'resolution' => $this->resolution,
            'resolutionNotes' => $this->resolution_notes,
            'rejectionReason' => $this->rejection_reason,
            'pickup' => [
                'providerCode' => $this->pickup_provider_code,
                'trackingNumber' => $this->pickup_tracking_number,
                'scheduledAt' => $this->pickup_scheduled_at?->toIso8601String(),
            ],
            'receivedAt' => $this->received_at?->toIso8601String(),
            'inspectionStartedAt' => $this->inspection_started_at?->toIso8601String(),
            'resolvedAt' => $this->resolved_at?->toIso8601String(),
            'completedAt' => $this->completed_at?->toIso8601String(),
            'rejectedAt' => $this->rejected_at?->toIso8601String(),
            'cancelledAt' => $this->cancelled_at?->toIso8601String(),
            'version' => $this->lock_version,
            'items' => ReturnRequestItemResource::collection($this->whenLoaded('items')),
            'timeline' => ReturnTimelineEventResource::collection($this->whenLoaded('timelineEvents')),
            'notes' => ReturnNoteResource::collection($this->whenLoaded('notes')),
            'refundRequest' => new RefundRequestResource($this->whenLoaded('refundRequest')),
            'exchangeRequest' => new ExchangeRequestResource($this->whenLoaded('exchangeRequest')),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
