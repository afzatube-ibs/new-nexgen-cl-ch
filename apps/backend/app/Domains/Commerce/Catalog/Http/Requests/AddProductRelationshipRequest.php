<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductRelationship;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AddProductRelationshipRequest extends FormRequest
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
            'related_product_id' => ['required', 'uuid', 'exists:products,id'],
            'type' => ['required', 'string', Rule::in(ProductRelationship::types())],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $product = $this->route('product');

            if ($product instanceof Product && $this->input('related_product_id') === $product->id) {
                $validator->errors()->add('related_product_id', 'A product cannot be related to itself.');
            }
        });
    }
}
