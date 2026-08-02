<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddProductImageRequest extends FormRequest
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
            'media_id' => ['required', 'uuid', 'exists:media_assets,id'],
            'position' => ['nullable', 'integer', 'min:0'],
            'is_primary' => ['nullable', 'boolean'],
        ];
    }
}
