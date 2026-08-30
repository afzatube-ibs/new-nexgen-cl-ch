<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Http\Resources;

use App\Domains\Commerce\Reviews\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Review
 */
final class ReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'customerId' => $this->customer_id,
            'authorName' => $this->author_name,
            'orderId' => $this->order_id,
            'rating' => $this->rating,
            'title' => $this->title,
            'body' => $this->body,
            'verifiedPurchase' => $this->verified_purchase,
            'status' => $this->status,
            'rejectionReason' => $this->rejection_reason,
            'merchantResponse' => $this->hasMerchantResponse() ? [
                'body' => $this->merchant_response_body,
                'respondedAt' => $this->merchant_responded_at?->toIso8601String(),
            ] : null,
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
