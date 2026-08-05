<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Reuses Localization & Currency's IsValidCurrencyCode rule rather than
 * duplicating the ISO 4217 list, exactly as Pricing's and Promotions' own
 * create requests already do (allowed per MODULE:INTERACTION_RULES' "Into
 * Platform" exception — any module, in any domain, may depend on any
 * Platform module directly).
 */
final class CreateShippingRateRequest extends FormRequest
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
            'shipping_zone_id' => [
                'required',
                'uuid',
                'exists:shipping_zones,id',
                Rule::unique('shipping_rates')->where(fn ($query) => $query
                    ->where('shipping_method_id', $this->input('shipping_method_id'))
                    ->where('min_weight_grams', $this->input('min_weight_grams', 0))),
            ],
            'shipping_method_id' => ['required', 'uuid', 'exists:shipping_methods,id'],
            'min_weight_grams' => ['sometimes', 'integer', 'min:0'],
            'max_weight_grams' => ['sometimes', 'nullable', 'integer', 'gt:min_weight_grams'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3', new IsValidCurrencyCode],
        ];
    }
}
