<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * "Guest checkout" and "Registered customer checkout": exactly one of
 * `customer_id` or the (`guest_email`, `guest_name`) pair must be
 * supplied — never both, never neither.
 */
final class StartCheckoutRequest extends FormRequest
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
            'customer_id' => ['nullable', 'uuid', 'exists:customers,id'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_name' => ['nullable', 'string', 'max:255'],
            'currency_code' => ['required', 'string', 'size:3', new IsValidCurrencyCode],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $hasCustomer = $this->filled('customer_id');
            $hasGuest = $this->filled('guest_email') || $this->filled('guest_name');

            if ($hasCustomer && $hasGuest) {
                $validator->errors()->add('customer_id', 'Provide either customer_id or guest details, not both.');
            }

            if (! $hasCustomer && ! $hasGuest) {
                $validator->errors()->add('customer_id', 'Provide either customer_id or both guest_email and guest_name.');
            }

            if (! $hasCustomer && (! $this->filled('guest_email') || ! $this->filled('guest_name'))) {
                $validator->errors()->add('guest_email', 'Both guest_email and guest_name are required for a guest checkout.');
            }
        });
    }
}
