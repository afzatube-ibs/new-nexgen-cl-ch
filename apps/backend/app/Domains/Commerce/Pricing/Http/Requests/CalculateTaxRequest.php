<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CalculateTaxRequest extends FormRequest
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
            'tax_class_id' => ['required', 'uuid', 'exists:tax_classes,id'],
            'country_code' => ['required', 'string', 'regex:/^[A-Z]{2}$/i'],
            'region' => ['sometimes', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0'],
        ];
    }
}
