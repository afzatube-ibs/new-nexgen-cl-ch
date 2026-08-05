<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * "Idempotent checkout submission": `idempotency_key` is the caller's own
 * stable token for this specific submission attempt (a client typically
 * generates one UUID per "place order" button press and reuses it across
 * network retries of that same press) — see Actions\SubmitCheckoutAction's
 * docblock for how this module actually enforces safety under a duplicate
 * or concurrent submission regardless of whether the key matches.
 */
final class SubmitCheckoutRequest extends FormRequest
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
            'idempotency_key' => ['required', 'string', 'max:255'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
