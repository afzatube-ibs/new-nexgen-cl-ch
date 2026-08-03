<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use App\Domains\Commerce\Pricing\Models\TaxRate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class UpdateTaxRateRequest extends FormRequest
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
            'tax_zone_id' => ['sometimes', 'uuid', 'exists:tax_zones,id'],
            'tax_class_id' => ['sometimes', 'uuid', 'exists:tax_classes,id'],
            'rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * See Http\Requests\CreateTaxRateRequest — (tax_zone_id, tax_class_id)
     * uniqueness resolved against either this request's payload or the
     * rate's own current values, the same partial-update pattern
     * UpdatePriceListEntryRequest uses for its own cross-field check.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->hasAny(['tax_zone_id', 'tax_class_id']) || $validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var TaxRate|null $rate */
            $rate = $this->route('taxRate');
            $zoneId = $this->input('tax_zone_id', $rate?->tax_zone_id);
            $classId = $this->input('tax_class_id', $rate?->tax_class_id);

            $query = TaxRate::query()
                ->where('tax_zone_id', $zoneId)
                ->where('tax_class_id', $classId);

            if ($rate !== null) {
                $query->where('id', '!=', $rate->id);
            }

            $exists = $query->exists();

            if ($exists) {
                $validator->errors()->add('tax_zone_id', 'A tax rate for this zone and class already exists.');
            }
        });
    }
}
