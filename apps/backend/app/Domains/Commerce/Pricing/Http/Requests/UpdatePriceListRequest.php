<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

final class UpdatePriceListRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'currency_code' => ['sometimes', 'string', 'size:3', new IsValidCurrencyCode],
            'is_default' => ['sometimes', 'boolean'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
