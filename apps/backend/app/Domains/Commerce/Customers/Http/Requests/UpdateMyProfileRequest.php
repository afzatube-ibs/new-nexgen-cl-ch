<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Self-service variant of UpdateCustomerProfileRequest — same rules, but
 * the email-uniqueness check excludes the caller's own record via the
 * authenticated principal (`$this->user()`), never a `{customer}` route
 * parameter: `customers/me` binds no such parameter, and reusing the
 * staff request as-is here would falsely reject a customer who submits
 * their own unchanged email (`Rule::unique(...)->ignore(null)` excludes
 * nothing).
 */
final class UpdateMyProfileRequest extends FormRequest
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
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('customers', 'email')->ignore($this->user()?->id)],
            'phone' => ['sometimes', 'string', 'max:50', Rule::unique('customers', 'phone')->ignore($this->user()?->id)],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
