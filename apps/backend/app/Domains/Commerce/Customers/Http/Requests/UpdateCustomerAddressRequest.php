<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateCustomerAddressRequest extends FormRequest
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
            'label' => ['sometimes', 'nullable', 'string', 'max:100'],
            'recipient_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address_line1' => ['sometimes', 'string', 'max:255'],
            'address_line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'string', 'max:255'],
            'region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'country_code' => ['sometimes', 'string', 'regex:/^[A-Z]{2}$/i'],
            'is_default_shipping' => ['sometimes', 'boolean'],
            'is_default_billing' => ['sometimes', 'boolean'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
