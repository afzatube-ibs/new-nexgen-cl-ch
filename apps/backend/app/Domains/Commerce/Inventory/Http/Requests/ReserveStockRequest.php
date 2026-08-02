<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ReserveStockRequest extends FormRequest
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
            'quantity' => ['required', 'integer', 'min:1'],
            'reference_type' => ['nullable', 'string', 'max:255'],
            'reference_id' => ['nullable', 'string', 'max:255'],
        ];
    }
}
