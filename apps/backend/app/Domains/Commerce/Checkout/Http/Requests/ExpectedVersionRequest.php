<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by every endpoint whose only input is DATA:VERSIONING's
 * expected_version — removing an item, and reviewing a session.
 */
final class ExpectedVersionRequest extends FormRequest
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
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
