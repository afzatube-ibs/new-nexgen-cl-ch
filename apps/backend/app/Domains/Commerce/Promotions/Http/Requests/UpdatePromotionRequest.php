<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Requests;

use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class UpdatePromotionRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'discount_type' => ['sometimes', Rule::in([
                Promotion::TYPE_PERCENTAGE, Promotion::TYPE_FIXED_AMOUNT, Promotion::TYPE_BUY_X_GET_Y, Promotion::TYPE_FREE_SHIPPING,
            ])],
            'discount_value' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'currency_code' => ['sometimes', 'nullable', 'string', 'size:3', new IsValidCurrencyCode],
            'buy_x_quantity' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'buy_x_target_type' => ['sometimes', 'nullable', Rule::in([Promotion::TARGET_PRODUCT, Promotion::TARGET_CATEGORY])],
            'buy_x_target_id' => ['sometimes', 'nullable', 'uuid'],
            'get_y_quantity' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'get_y_target_type' => ['sometimes', 'nullable', Rule::in([Promotion::TARGET_PRODUCT, Promotion::TARGET_CATEGORY])],
            'get_y_target_id' => ['sometimes', 'nullable', 'uuid'],
            'get_y_discount_percentage' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'is_stackable' => ['sometimes', 'boolean'],
            'priority' => ['sometimes', 'integer', 'min:0'],
            'requires_coupon' => ['sometimes', 'boolean'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after:starts_at'],
            'usage_limit_global' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'usage_limit_per_customer' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * Resolves the *effective* discount_type/discount_value/currency_code
     * from either this partial update's payload or the promotion's
     * existing values — the same pattern UpdatePriceListEntryRequest uses
     * for its own cross-field, partial-update validation.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Promotion|null $promotion */
            $promotion = $this->route('promotion');

            $type = $this->input('discount_type', $promotion?->discount_type);
            $discountValue = $this->input('discount_value', $promotion?->discount_value);
            $currencyCode = $this->input('currency_code', $promotion?->currency_code);

            if (in_array($type, [Promotion::TYPE_PERCENTAGE, Promotion::TYPE_FIXED_AMOUNT], true) && $discountValue === null) {
                $validator->errors()->add('discount_value', 'This discount type requires a discount value.');
            }

            if ($type === Promotion::TYPE_FIXED_AMOUNT && $currencyCode === null) {
                $validator->errors()->add('currency_code', 'A fixed-amount promotion requires a currency code.');
            }

            if ($type === Promotion::TYPE_BUY_X_GET_Y) {
                foreach (['buy_x_quantity', 'get_y_quantity', 'get_y_discount_percentage'] as $field) {
                    if ($this->input($field, $promotion?->{$field}) === null) {
                        $validator->errors()->add($field, 'A buy-X-get-Y promotion requires this field.');
                    }
                }
            }
        });
    }
}
