<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateWarehouseRequest extends FormRequest
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
            'code' => ['required', 'string', 'max:100', 'alpha_dash', 'unique:warehouses,code'],
            'name' => ['required', 'string', 'max:255'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:50'],
            'country_code' => ['nullable', 'string', 'regex:/^[A-Z]{2}$/'],
            'is_default' => ['nullable', 'boolean'],
        ];
    }
}
