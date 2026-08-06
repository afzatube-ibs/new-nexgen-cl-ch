<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Resources;

use App\Domains\Operations\Returns\Models\RefundRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin RefundRequest
 */
final class RefundRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'returnRequestId' => $this->return_request_id,
            'paymentId' => $this->payment_id,
            'amount' => $this->amount,
            'currencyCode' => $this->currency_code,
            'status' => $this->status,
            'gatewayReference' => $this->gateway_reference,
            'failureReason' => $this->failure_reason,
            'requestedAt' => $this->requested_at->toIso8601String(),
            'completedAt' => $this->completed_at?->toIso8601String(),
            'version' => $this->lock_version,
        ];
    }
}
