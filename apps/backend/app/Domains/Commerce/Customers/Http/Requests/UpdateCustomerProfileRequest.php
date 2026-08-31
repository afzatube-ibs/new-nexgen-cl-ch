<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCustomerProfileRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('customers', 'email')->ignore($this->route('customer'))],
            'phone' => ['sometimes', 'string', 'max:50', Rule::unique('customers', 'phone')->ignore($this->route('customer'))],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
