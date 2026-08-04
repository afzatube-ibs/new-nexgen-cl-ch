<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Requests;

use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * `currency_code` is validated against Localization & Currency's curated
 * ISO 4217 list — a declared dependency of this module (docs/04_MODULE_
 * ARCHITECTURE.md's MODULE:PROMOTIONS entry) — rather than duplicating
 * that list a further time, exactly as Pricing's own CreatePriceListRequest
 * already does.
 */
final class CreatePromotionRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'discount_type' => ['required', Rule::in([
                Promotion::TYPE_PERCENTAGE, Promotion::TYPE_FIXED_AMOUNT, Promotion::TYPE_BUY_X_GET_Y, Promotion::TYPE_FREE_SHIPPING,
            ])],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'currency_code' => ['nullable', 'string', 'size:3', new IsValidCurrencyCode],
            'buy_x_quantity' => ['nullable', 'integer', 'min:1'],
            'buy_x_target_type' => ['nullable', Rule::in([Promotion::TARGET_PRODUCT, Promotion::TARGET_CATEGORY])],
            'buy_x_target_id' => ['nullable', 'uuid'],
            'get_y_quantity' => ['nullable', 'integer', 'min:1'],
            'get_y_target_type' => ['nullable', Rule::in([Promotion::TARGET_PRODUCT, Promotion::TARGET_CATEGORY])],
            'get_y_target_id' => ['nullable', 'uuid'],
            'get_y_discount_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_stackable' => ['sometimes', 'boolean'],
            'priority' => ['sometimes', 'integer', 'min:0'],
            'requires_coupon' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'usage_limit_global' => ['nullable', 'integer', 'min:1'],
            'usage_limit_per_customer' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * "Validation engine": each discount_type carries its own required
     * companion fields — a percentage/fixed-amount promotion needs a
     * discount_value (fixed-amount also needs a currency_code, since a
     * fixed amount is denominated in one), and a buy-X-get-Y promotion
     * needs its quantity/discount fields. Free shipping needs neither.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $type = $this->input('discount_type');

            if (in_array($type, [Promotion::TYPE_PERCENTAGE, Promotion::TYPE_FIXED_AMOUNT], true) && $this->input('discount_value') === null) {
                $validator->errors()->add('discount_value', 'This discount type requires a discount value.');
            }

            if ($type === Promotion::TYPE_FIXED_AMOUNT && $this->input('currency_code') === null) {
                $validator->errors()->add('currency_code', 'A fixed-amount promotion requires a currency code.');
            }

            if ($type === Promotion::TYPE_BUY_X_GET_Y) {
                foreach (['buy_x_quantity', 'get_y_quantity', 'get_y_discount_percentage'] as $field) {
                    if ($this->input($field) === null) {
                        $validator->errors()->add($field, 'A buy-X-get-Y promotion requires this field.');
                    }
                }
            }
        });
    }
}
