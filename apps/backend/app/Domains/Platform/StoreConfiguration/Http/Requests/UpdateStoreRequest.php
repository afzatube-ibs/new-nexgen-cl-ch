<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Http\Requests;

use App\Domains\Platform\StoreConfiguration\Http\Rules\ValidTimezone;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateStoreRequest extends FormRequest
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
            'legal_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'currency_code' => ['sometimes', 'string', 'regex:/^[A-Z]{3}$/'],
            'locale' => ['sometimes', 'string', 'regex:/^[a-z]{2,3}(-[A-Z]{2})?$/'],
            'timezone' => ['sometimes', 'string', new ValidTimezone],
            'contact_email' => ['sometimes', 'email', 'max:255'],
            'contact_phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address_line1' => ['sometimes', 'string', 'max:255'],
            'address_line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'string', 'max:255'],
            'region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'country_code' => ['sometimes', 'string', 'regex:/^[A-Z]{2}$/'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
