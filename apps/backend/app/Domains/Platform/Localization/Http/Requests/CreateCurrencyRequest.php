<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `is_base` is deliberately not accepted here — see
 * Actions\CreateCurrencyAction's docblock for why promoting a currency to
 * base is a separate operation.
 */
final class CreateCurrencyRequest extends FormRequest
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
            'code' => ['required', 'string', 'size:3', new IsValidCurrencyCode, 'unique:currencies,code'],
            'name' => ['required', 'string', 'max:255'],
            'symbol' => ['required', 'string', 'max:10'],
            'decimal_places' => ['sometimes', 'integer', 'min:0', 'max:4'],
            'exchange_rate' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
