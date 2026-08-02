<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateProductImageRequest extends FormRequest
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
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_primary' => ['sometimes', 'boolean'],
        ];
    }
}
