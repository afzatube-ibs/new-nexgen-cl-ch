<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            // `whereNull('deleted_at')`: `ProductVariant` uses SoftDeletes, and Laravel's `unique` rule checks
            // every row by default, including soft-deleted ones — without this, deleting a variant (e.g. to
            // regenerate it via the Matrix/Generator, a normal merchant workflow) permanently blocks its SKU
            // from ever being reused, with a bare "sku has already been taken" 422 and no visible cause. Found
            // via a PO acceptance audit of Phase 2.2 (2026-08-11): "Generate all" appeared to silently generate
            // only one variant per click when in fact every combo after the first soft-deleted collision was
            // failing this check and the frontend loop had no error handling either (see VariantsCard.tsx's own
            // fix, same audit).
            'sku' => ['required', 'string', 'max:100', Rule::unique('product_variants', 'sku')->whereNull('deleted_at')],
            'barcode' => ['nullable', 'string', 'max:100'],
            'position' => ['nullable', 'integer', 'min:0'],
            'option_value_ids' => ['required', 'array', 'min:1'],
            'option_value_ids.*' => ['uuid', 'exists:option_values,id'],
        ];
    }
}
