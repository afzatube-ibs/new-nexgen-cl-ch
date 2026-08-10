<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateProductRequest extends FormRequest
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
            'brand_id' => ['sometimes', 'nullable', 'uuid', 'exists:brands,id'],
            // See `CreateProductRequest`'s identical fix for why `whereNull('deleted_at')` is required here.
            'sku' => ['sometimes', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($this->route('product'))->whereNull('deleted_at')],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:100'],
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'short_description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'product_type' => ['sometimes', 'string', Rule::in(Product::types())],
            'visibility' => ['sometimes', 'string', Rule::in(Product::visibilities())],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_keywords' => ['sometimes', 'nullable', 'string', 'max:255'],
            'metadata' => ['sometimes', 'nullable', 'array'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
