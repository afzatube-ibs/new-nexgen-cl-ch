<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class InitiateStockTransferRequest extends FormRequest
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
            'from_warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'to_warehouse_id' => ['required', 'uuid', 'exists:warehouses,id', 'different:from_warehouse_id'],
            'sku' => ['required', 'string', 'max:100'],
            'quantity' => ['required', 'integer', 'min:1'],
        ];
    }
}
