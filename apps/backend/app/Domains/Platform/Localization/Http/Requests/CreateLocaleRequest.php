<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `is_default` is deliberately not accepted here — see
 * Actions\CreateLocaleAction's docblock for why promoting a locale to
 * default is a separate operation.
 */
final class CreateLocaleRequest extends FormRequest
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
            'code' => ['required', 'string', 'regex:/^[a-z]{2,3}(-[A-Z]{2})?$/', 'unique:locales,code'],
            'name' => ['required', 'string', 'max:255'],
            'native_name' => ['required', 'string', 'max:255'],
            'is_rtl' => ['sometimes', 'boolean'],
        ];
    }
}
