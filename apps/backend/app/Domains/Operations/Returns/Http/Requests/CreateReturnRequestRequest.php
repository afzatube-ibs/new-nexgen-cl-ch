<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Requests;

use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CreateReturnRequestRequest extends FormRequest
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
            'order_id' => ['required', 'uuid'],
            'customer_id' => ['required', 'uuid'],
            'type' => ['sometimes', Rule::in([ReturnRequest::TYPE_RETURN, ReturnRequest::TYPE_EXCHANGE])],
            'reason' => ['required', Rule::in([
                ReturnRequest::REASON_DAMAGED,
                ReturnRequest::REASON_WRONG_ITEM,
                ReturnRequest::REASON_COURIER_DAMAGE,
                ReturnRequest::REASON_DELIVERY_REFUSED,
                ReturnRequest::REASON_CHANGED_MIND,
                ReturnRequest::REASON_OTHER,
            ])],
            'reason_details' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sku' => ['required', 'string', 'max:100'],
            'items.*.description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }
}
