<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Resources;

use App\Domains\Operations\Returns\Models\ExchangeRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ExchangeRequest
 */
final class ExchangeRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'returnRequestId' => $this->return_request_id,
            'desiredSku' => $this->desired_sku,
            'desiredDescription' => $this->desired_description,
            'desiredQuantity' => $this->desired_quantity,
            'status' => $this->status,
            'trackingNumber' => $this->tracking_number,
            'completedAt' => $this->completed_at?->toIso8601String(),
            'version' => $this->lock_version,
        ];
    }
}
