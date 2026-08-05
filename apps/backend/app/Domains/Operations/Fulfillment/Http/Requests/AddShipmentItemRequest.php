<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddShipmentItemRequest extends FormRequest
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
            'sku' => ['required', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'quantity' => ['required', 'integer', 'min:1'],
        ];
    }
}
