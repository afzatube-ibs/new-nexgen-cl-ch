<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddOrderNoteRequest extends FormRequest
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
            'body' => ['required', 'string', 'max:5000'],
            'is_customer_visible' => ['sometimes', 'boolean'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
