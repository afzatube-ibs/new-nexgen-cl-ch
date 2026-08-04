<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCouponRequest extends FormRequest
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
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('coupons', 'code')->ignore($this->route('coupon'))],
            'usage_limit_global' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
