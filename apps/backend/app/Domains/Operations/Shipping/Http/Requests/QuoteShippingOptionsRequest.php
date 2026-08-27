<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Http\Controllers\ShippingQuoteOptionsController's input — deliberately
 * has no `shipping_method_id` (unlike QuoteShippingRateRequest): this
 * endpoint answers "which methods can ship this," not "confirm this one
 * method."
 */
final class QuoteShippingOptionsRequest extends FormRequest
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
            'country_code' => ['required', 'string', 'regex:/^[A-Z]{2}$/i'],
            'region' => ['sometimes', 'string', 'max:100'],
            'weight_grams' => ['required', 'integer', 'min:1'],
        ];
    }
}
