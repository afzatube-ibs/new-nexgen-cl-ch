<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by every endpoint whose only input is DATA:VERSIONING's
 * expected_version — manual capture (Cash On Delivery confirm, Bank
 * Transfer approve).
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
