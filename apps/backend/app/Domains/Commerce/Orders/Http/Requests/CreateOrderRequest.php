<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `customer_id` must reference a real Customers\Models\Customer row —
 * this module's one real code-level cross-module dependency (see
 * Actions\CreateOrderAction's docblock). `currency_code` is validated
 * against Localization & Currency's curated ISO 4217 list, exactly as
 * Pricing's and Promotions' own create requests already do.
 *
 * Each address accepts either an `address_id` referencing an entry in the
 * customer's own address book, or a full inline address — see Actions\
 * CreateOrderAction::resolveAddress() for how either is turned into a
 * frozen snapshot.
 */
final class CreateOrderRequest extends FormRequest
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
            'customer_id' => ['required', 'uuid', 'exists:customers,id'],
            'currency_code' => ['required', 'string', 'size:3', new IsValidCurrencyCode],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'uuid'],
            'items.*.sku' => ['required', 'string', 'max:100'],
            'items.*.product_name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['sometimes', 'numeric', 'min:0'],
            'items.*.tax_amount' => ['sometimes', 'numeric', 'min:0'],

            'billing_address' => ['required', 'array'],
            'billing_address.address_id' => ['sometimes', 'nullable', 'uuid'],
            'billing_address.recipient_name' => ['required_without:billing_address.address_id', 'string', 'max:255'],
            'billing_address.phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'billing_address.address_line1' => ['required_without:billing_address.address_id', 'string', 'max:255'],
            'billing_address.address_line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'billing_address.city' => ['required_without:billing_address.address_id', 'string', 'max:255'],
            'billing_address.region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'billing_address.postal_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'billing_address.country_code' => ['required_without:billing_address.address_id', 'string', 'regex:/^[A-Z]{2}$/i'],

            'shipping_address' => ['required', 'array'],
            'shipping_address.address_id' => ['sometimes', 'nullable', 'uuid'],
            'shipping_address.recipient_name' => ['required_without:shipping_address.address_id', 'string', 'max:255'],
            'shipping_address.phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'shipping_address.address_line1' => ['required_without:shipping_address.address_id', 'string', 'max:255'],
            'shipping_address.address_line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required_without:shipping_address.address_id', 'string', 'max:255'],
            'shipping_address.region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shipping_address.postal_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'shipping_address.country_code' => ['required_without:shipping_address.address_id', 'string', 'regex:/^[A-Z]{2}$/i'],

            'discounts' => ['sometimes', 'array'],
            'discounts.*.promotion_id' => ['sometimes', 'nullable', 'uuid'],
            'discounts.*.code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'discounts.*.label' => ['required_with:discounts', 'string', 'max:255'],
            'discounts.*.amount' => ['required_with:discounts', 'numeric', 'min:0'],

            'shipping_total' => ['sometimes', 'numeric', 'min:0'],
        ];
    }
}
