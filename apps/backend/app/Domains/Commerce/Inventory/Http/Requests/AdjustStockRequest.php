<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AdjustStockRequest extends FormRequest
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
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'sku' => ['required', 'string', 'max:100'],
            'quantity_delta' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'max:255'],
        ];
    }
}
