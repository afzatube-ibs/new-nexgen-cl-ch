<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Http\Controllers\ShippingRateQuoteController's input — this module's
 * "Rate query" Public Contract at the API boundary, per planning/
 * IMPLEMENTATION_MASTER_PLAN.md's Shipping & Logistics entry.
 */
final class QuoteShippingRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'shipping_method_id' => ['required', 'uuid', 'exists:shipping_methods,id'],
            'country_code' => ['required', 'string', 'regex:/^[A-Z]{2}$/i'],
            'region' => ['sometimes', 'string', 'max:100'],
            'weight_grams' => ['required', 'integer', 'min:1'],
        ];
    }
}
