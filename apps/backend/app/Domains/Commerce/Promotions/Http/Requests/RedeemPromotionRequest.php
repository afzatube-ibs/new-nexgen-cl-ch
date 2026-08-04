<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

final class RedeemPromotionRequest extends FormRequest
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
            'promotion_id' => ['required', 'uuid', 'exists:promotions,id'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'customer_id' => ['nullable', 'uuid'],
            'order_reference' => ['nullable', 'string', 'max:255'],
            'discount_amount' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3', new IsValidCurrencyCode],
        ];
    }
}
