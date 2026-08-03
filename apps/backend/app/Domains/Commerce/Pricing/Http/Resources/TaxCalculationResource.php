<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Resources;

use App\Domains\Commerce\Pricing\Support\TaxCalculationResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wraps a plain Support\TaxCalculationResult value object, not an Eloquent
 * model — see that class's docblock for why tax calculation has no
 * persisted aggregate to represent.
 *
 * @mixin TaxCalculationResult
 */
final class TaxCalculationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'amount' => $this->amount,
            'rate' => $this->rate,
            'taxAmount' => $this->taxAmount,
            'totalAmount' => $this->totalAmount,
            'taxZoneId' => $this->taxZoneId,
        ];
    }
}
