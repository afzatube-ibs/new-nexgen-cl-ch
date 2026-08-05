<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Requests;

use App\Domains\Operations\Shipping\Models\ShippingMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateShippingMethodRequest extends FormRequest
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
        $method = $this->route('shippingMethod');
        $methodId = $method instanceof ShippingMethod ? $method->id : null;

        return [
            'code' => ['sometimes', 'string', 'max:100', 'regex:/^[a-z0-9_-]+$/', Rule::unique(ShippingMethod::class, 'code')->ignore($methodId)],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'provider_code' => ['sometimes', 'nullable', 'string', 'max:100'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
