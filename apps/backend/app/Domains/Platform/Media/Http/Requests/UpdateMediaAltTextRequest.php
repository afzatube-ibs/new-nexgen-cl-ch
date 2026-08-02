<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateMediaAltTextRequest extends FormRequest
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
            'alt_text' => ['nullable', 'string', 'max:255'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
