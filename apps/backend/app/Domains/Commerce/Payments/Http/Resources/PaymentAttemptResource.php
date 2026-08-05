<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Resources;

use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Deliberately excludes `request_payload`/`response_payload` — a
 * gateway's raw response is Confidential audit data (available through
 * this module's own audit log for a caller with `payments.audit_log.view`),
 * not part of this resource's ordinary read surface, per DATA:
 * CLASSIFICATION's "protection travels with the data itself."
 *
 * @mixin PaymentAttempt
 */
final class PaymentAttemptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'status' => $this->status,
            'gatewayCode' => $this->gateway_code,
            'gatewayReference' => $this->gateway_reference,
            'amount' => $this->amount,
            'currencyCode' => $this->currency_code,
            'failureReason' => $this->failure_reason,
            'occurredAt' => $this->occurred_at->toIso8601String(),
        ];
    }
}
