<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddCheckoutItemRequest extends FormRequest
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
            'product_id' => ['required', 'uuid', 'exists:products,id'],
            'variant_id' => ['sometimes', 'nullable', 'uuid'],
            'quantity' => ['required', 'integer', 'min:1'],
            'tax_class_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_classes,id'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
