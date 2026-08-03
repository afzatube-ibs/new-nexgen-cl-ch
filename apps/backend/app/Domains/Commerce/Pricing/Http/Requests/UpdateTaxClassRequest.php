<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateTaxClassRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('tax_classes', 'name')->ignore($this->route('taxClass'))],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
