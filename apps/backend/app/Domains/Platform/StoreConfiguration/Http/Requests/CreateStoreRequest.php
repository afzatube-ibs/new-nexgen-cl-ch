<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Http\Requests;

use App\Domains\Platform\StoreConfiguration\Http\Rules\ValidTimezone;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `currency_code` and `country_code` are validated for ISO *shape* only
 * (3 uppercase letters; 2 uppercase letters) — full ISO 4217 / ISO 3166-1
 * registry validation is the future Localization & Currency module's
 * ownership (implementation order item 5), not Store Configuration's,
 * per DATA:CROSS_MODULE_ACCESS keeping this module's scope to what it
 * actually owns: the store's profile, not a currency/country authority.
 */
final class CreateStoreRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'currency_code' => ['required', 'string', 'regex:/^[A-Z]{3}$/'],
            'locale' => ['required', 'string', 'regex:/^[a-z]{2,3}(-[A-Z]{2})?$/'],
            'timezone' => ['required', 'string', new ValidTimezone],
            'contact_email' => ['required', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:50'],
            'country_code' => ['required', 'string', 'regex:/^[A-Z]{2}$/'],
        ];
    }
}
