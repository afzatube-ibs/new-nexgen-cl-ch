<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by every status-transition endpoint whose only input is DATA:
 * VERSIONING's expected_version — confirm, start-processing, ship, deliver.
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
