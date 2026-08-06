<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddReturnNoteRequest extends FormRequest
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
            'body' => ['required', 'string', 'max:2000'],
            'is_customer_visible' => ['sometimes', 'boolean'],
        ];
    }
}
