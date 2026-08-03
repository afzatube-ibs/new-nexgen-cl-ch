<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateLocaleRequest extends FormRequest
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
            'code' => ['sometimes', 'string', 'regex:/^[a-z]{2,3}(-[A-Z]{2})?$/', Rule::unique('locales', 'code')->ignore($this->route('locale'))],
            'name' => ['sometimes', 'string', 'max:255'],
            'native_name' => ['sometimes', 'string', 'max:255'],
            'is_rtl' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
