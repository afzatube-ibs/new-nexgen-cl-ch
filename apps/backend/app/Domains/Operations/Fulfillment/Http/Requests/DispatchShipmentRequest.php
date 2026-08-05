<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class DispatchShipmentRequest extends FormRequest
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
            'shipping_method_id' => ['sometimes', 'nullable', 'uuid'],
            'tracking_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
