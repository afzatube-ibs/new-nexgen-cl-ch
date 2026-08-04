<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateCouponRequest extends FormRequest
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
            'code' => ['required', 'string', 'max:50', 'unique:coupons,code'],
            'usage_limit_global' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
