<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ApplyCouponRequest extends FormRequest
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
            'coupon_code' => ['required', 'string', 'max:50'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
