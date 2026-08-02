<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateProductVariantRequest extends FormRequest
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
            'sku' => ['sometimes', 'string', 'max:100', Rule::unique('product_variants', 'sku')->ignore($this->route('variant'))],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:100'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
