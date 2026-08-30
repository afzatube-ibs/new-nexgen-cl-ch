<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RejectReviewRequest extends FormRequest
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
            'reason' => ['required', 'string', 'max:1000'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
