<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by any endpoint whose only input is DATA:VERSIONING's
 * expected_version — archiving and deleting any of this module's
 * versioned aggregates.
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
