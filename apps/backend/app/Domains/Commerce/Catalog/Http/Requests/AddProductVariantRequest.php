<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddProductVariantRequest extends FormRequest
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
            'sku' => ['required', 'string', 'max:100', 'unique:product_variants,sku'],
            'barcode' => ['nullable', 'string', 'max:100'],
            'position' => ['nullable', 'integer', 'min:0'],
            'option_value_ids' => ['required', 'array', 'min:1'],
            'option_value_ids.*' => ['uuid', 'exists:option_values,id'],
        ];
    }
}
