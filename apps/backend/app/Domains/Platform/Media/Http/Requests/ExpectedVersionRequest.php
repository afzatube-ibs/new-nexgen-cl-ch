<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
