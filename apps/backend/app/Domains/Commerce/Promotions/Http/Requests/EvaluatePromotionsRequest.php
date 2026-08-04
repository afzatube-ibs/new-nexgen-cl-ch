<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the wire shape of Support\CartContext — see that class's
 * docblock for the module-boundary reasoning behind why this accepts a
 * plain, self-contained cart description rather than resolving anything
 * from Catalog/Customers/Store Configuration itself.
 */
final class EvaluatePromotionsRequest extends FormRequest
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
            'items' => ['present', 'array'],
            'items.*.product_id' => ['required', 'uuid'],
            'items.*.category_ids' => ['sometimes', 'array'],
            'items.*.category_ids.*' => ['uuid'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3', new IsValidCurrencyCode],
            'customer_id' => ['nullable', 'uuid'],
            'store_id' => ['nullable', 'uuid'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
        ];
    }
}
