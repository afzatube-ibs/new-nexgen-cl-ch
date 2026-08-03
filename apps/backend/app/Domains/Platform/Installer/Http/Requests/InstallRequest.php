<?php

declare(strict_types=1);

namespace App\Domains\Platform\Installer\Http\Requests;

use App\Domains\Platform\StoreConfiguration\Http\Rules\ValidTimezone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Validation mirrors Identity & Access's RegisterUserRequest (admin.*) and
 * Store Configuration's CreateStoreRequest (store.*) exactly — this
 * request produces the payload InstallAction hands directly to those
 * modules' own actions, so the shape and rules must match theirs field for
 * field.
 */
final class InstallRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Deliberately always true and never permission-checked — per
        // planning/IMPLEMENTATION_MASTER_PLAN.md's Installer entry, this
        // flow is necessarily pre-authentication (no user, and therefore no
        // permission, exists yet before the first install completes).
        // InstallAction's own not-yet-installed check is this endpoint's
        // real gate.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'admin.name' => ['required', 'string', 'max:255'],
            'admin.email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'admin.password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],

            'store.name' => ['required', 'string', 'max:255'],
            'store.legal_name' => ['nullable', 'string', 'max:255'],
            'store.currency_code' => ['required', 'string', 'regex:/^[A-Z]{3}$/'],
            'store.locale' => ['required', 'string', 'regex:/^[a-z]{2,3}(-[A-Z]{2})?$/'],
            'store.timezone' => ['required', 'string', new ValidTimezone],
            'store.contact_email' => ['required', 'email', 'max:255'],
            'store.contact_phone' => ['nullable', 'string', 'max:50'],
            'store.address_line1' => ['required', 'string', 'max:255'],
            'store.address_line2' => ['nullable', 'string', 'max:255'],
            'store.city' => ['required', 'string', 'max:255'],
            'store.region' => ['nullable', 'string', 'max:255'],
            'store.postal_code' => ['nullable', 'string', 'max:50'],
            'store.country_code' => ['required', 'string', 'regex:/^[A-Z]{2}$/'],
        ];
    }
}
