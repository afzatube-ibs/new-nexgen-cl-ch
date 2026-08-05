<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateShippingRateRequest extends FormRequest
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
            'min_weight_grams' => ['sometimes', 'integer', 'min:0'],
            'max_weight_grams' => ['sometimes', 'nullable', 'integer', 'gt:min_weight_grams'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency_code' => ['sometimes', 'string', 'size:3', new IsValidCurrencyCode],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
