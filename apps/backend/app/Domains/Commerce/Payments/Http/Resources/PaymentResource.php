<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Resources;

use App\Domains\Commerce\Payments\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Payment
 */
final class PaymentResource extends JsonResource
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
            'gatewayCode' => $this->gateway_code,
            'currencyCode' => $this->currency_code,
            'amount' => $this->amount,
            'amountCaptured' => $this->amount_captured,
            'status' => $this->status,
            'proofReference' => $this->proof_reference,
            'redirectUrl' => $this->redirect_url,
            'instructions' => $this->instructions,
            'failureReason' => $this->failure_reason,
            'initiatedAt' => $this->initiated_at->toIso8601String(),
            'authorizedAt' => $this->authorized_at?->toIso8601String(),
            'capturedAt' => $this->captured_at?->toIso8601String(),
            'cancelledAt' => $this->cancelled_at?->toIso8601String(),
            'failedAt' => $this->failed_at?->toIso8601String(),
            'attempts' => PaymentAttemptResource::collection($this->whenLoaded('attempts')),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
