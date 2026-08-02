<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by any endpoint whose only input is DATA:VERSIONING's
 * expected_version — archiving and deleting a Store.
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
