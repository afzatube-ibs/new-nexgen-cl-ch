<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Actions\CreateShipmentAction's manual-creation input — the operator
 * supplies the same order identifiers OrderPlaced would have carried, per
 * that Action's own docblock.
 */
final class CreateShipmentRequest extends FormRequest
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
            'order_number' => ['required', 'string', 'max:100'],
            'customer_id' => ['required', 'uuid'],
            'grand_total' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'currency_code' => ['sometimes', 'nullable', 'string', 'size:3', new IsValidCurrencyCode],
        ];
    }
}
