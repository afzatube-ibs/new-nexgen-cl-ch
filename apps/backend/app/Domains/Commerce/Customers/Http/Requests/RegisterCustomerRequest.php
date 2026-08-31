<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

final class RegisterCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Permission enforcement happens once, at the route's `permission:`
        // middleware — never duplicated here, per SECURITY:AUTHORIZATION's
        // "no module performs its own bespoke, disconnected permission
        // logic."
        return true;
    }

    /**
     * Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — `phone` is
     * now the required, unique primary identity (was optional); `email`
     * is now optional (was required). `nullable` short-circuits the rest
     * of a field's own rule chain when the value is absent, so an
     * omitted `email` never reaches — and is never rejected by —
     * `unique:customers,email`, exactly like the pre-existing `phone`
     * rule did for the inverse case before this change.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50', 'unique:customers,phone'],
            'email' => ['nullable', 'email', 'max:255', 'unique:customers,email'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
        ];
    }
}
