<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CreateTaxRateRequest extends FormRequest
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
            'tax_zone_id' => [
                'required',
                'uuid',
                'exists:tax_zones,id',
                Rule::unique('tax_rates')->where(fn ($query) => $query->where('tax_class_id', $this->input('tax_class_id'))),
            ],
            'tax_class_id' => ['required', 'uuid', 'exists:tax_classes,id'],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
