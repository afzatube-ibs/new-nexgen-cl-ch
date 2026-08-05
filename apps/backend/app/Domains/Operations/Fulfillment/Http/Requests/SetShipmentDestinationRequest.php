<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SetShipmentDestinationRequest extends FormRequest
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
            'destination_recipient_name' => ['required', 'string', 'max:255'],
            'destination_phone' => ['required', 'string', 'max:30'],
            'destination_address_line1' => ['required', 'string', 'max:255'],
            'destination_address_line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'destination_city' => ['required', 'string', 'max:100'],
            'destination_region' => ['sometimes', 'nullable', 'string', 'max:100'],
            'destination_postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'destination_country_code' => ['required', 'string', 'regex:/^[A-Z]{2}$/i'],
            'weight_grams' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
