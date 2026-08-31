<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class LoginCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authentication IS the operation — SECURITY:AUTHORIZATION's
        // permission-check model does not apply to the act of logging in.
        return true;
    }

    /**
     * Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — a single
     * `identifier` field (phone-shaped or email-shaped, either is
     * accepted; see `Actions\LoginCustomerAction` for the OR lookup)
     * replaces the previous `email`-only field, per the Product Owner's
     * own requirement: "Customer login should support mobile number...
     * Email login may remain supported." Not validated as `email` or a
     * phone-specific format here — deliberately loose, since it must
     * accept either shape and the real lookup (not a format check) is
     * what actually decides whether it matches an account.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:255'],
        ];
    }
}
