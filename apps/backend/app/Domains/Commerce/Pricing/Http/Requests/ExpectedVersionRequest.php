<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by any endpoint whose only input is DATA:VERSIONING's
 * expected_version — archiving or deleting any aggregate in this module.
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
