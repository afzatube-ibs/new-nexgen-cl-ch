<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddShipmentNoteRequest extends FormRequest
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
