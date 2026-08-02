<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateTagRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
        ];
    }
}
