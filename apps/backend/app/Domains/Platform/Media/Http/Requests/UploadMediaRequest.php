<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UploadMediaRequest extends FormRequest
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
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,gif,webp,pdf', 'max:10240'],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ];
    }
}
