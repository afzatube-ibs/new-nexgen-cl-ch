<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Resources;

use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * "Payment Methods" — what Http\Controllers\PaymentMethodController lists
 * for a caller deciding which gateway to initiate a payment through.
 *
 * @mixin PaymentGatewayContract
 */
final class PaymentMethodResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code(),
            'label' => $this->label(),
        ];
    }
}
