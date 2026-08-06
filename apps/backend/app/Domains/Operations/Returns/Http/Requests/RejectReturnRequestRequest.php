<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RejectReturnRequestRequest extends FormRequest
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
