<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CreateProductRequest extends FormRequest
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
            'brand_id' => ['nullable', 'uuid', 'exists:brands,id'],
            // `whereNull('deleted_at')`: `Product` uses SoftDeletes, and Laravel's `unique` rule checks every row
            // by default, including soft-deleted ones — without this, deleting a product permanently blocks its
            // SKU from ever being reused. Found via a PO acceptance audit of Phase 2.2 (2026-08-11) live-testing
            // the Product Editor's Variant Generator, which surfaced the identical gap on `product_variants.sku`
            // first (see `AddProductVariantRequest`) before this one was checked and found to share it.
            'sku' => ['required', 'string', 'max:100', Rule::unique('products', 'sku')->whereNull('deleted_at')],
            'barcode' => ['nullable', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'product_type' => ['nullable', 'string', Rule::in(Product::types())],
            'weight_grams' => ['nullable', 'integer', 'min:1'],
            'visibility' => ['nullable', 'string', Rule::in(Product::visibilities())],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:255'],
            'meta_keywords' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
