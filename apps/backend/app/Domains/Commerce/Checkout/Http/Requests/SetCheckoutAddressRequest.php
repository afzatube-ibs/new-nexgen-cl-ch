<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SetCheckoutAddressRequest extends FormRequest
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
            'address_id' => ['sometimes', 'nullable', 'uuid'],
            'recipient_name' => ['required_without:address_id', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address_line1' => ['required_without:address_id', 'string', 'max:255'],
            'address_line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['required_without:address_id', 'string', 'max:255'],
            'region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'country_code' => ['required_without:address_id', 'string', 'regex:/^[A-Z]{2}$/i'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
