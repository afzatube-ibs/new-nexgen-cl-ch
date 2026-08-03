<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCurrencyRequest extends FormRequest
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
            'code' => ['sometimes', 'string', 'size:3', new IsValidCurrencyCode, Rule::unique('currencies', 'code')->ignore($this->route('currency'))],
            'name' => ['sometimes', 'string', 'max:255'],
            'symbol' => ['sometimes', 'string', 'max:10'],
            'decimal_places' => ['sometimes', 'integer', 'min:0', 'max:4'],
            'exchange_rate' => ['sometimes', 'numeric', 'gt:0'],
            'is_base' => ['sometimes', 'boolean'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
