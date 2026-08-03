<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class UpdateTaxZoneRequest extends FormRequest
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
            'country_code' => ['sometimes', 'string', 'regex:/^[A-Z]{2}$/i'],
            'region' => ['sometimes', 'string', 'max:100'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * See CreateTaxZoneRequest's docblock for why (country_code, region)
     * uniqueness is checked here rather than via a `Rule::unique` column
     * rule.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->hasAny(['country_code', 'region']) || $validator->errors()->has('country_code')) {
                return;
            }

            /** @var TaxZone|null $zone */
            $zone = $this->route('taxZone');
            $countryCode = strtoupper((string) $this->input('country_code', $zone?->country_code));
            $region = (string) $this->input('region', $zone?->region);

            $query = TaxZone::query()
                ->where('country_code', $countryCode)
                ->where('region', $region);

            if ($zone !== null) {
                $query->where('id', '!=', $zone->id);
            }

            $exists = $query->exists();

            if ($exists) {
                $validator->errors()->add('country_code', 'A tax zone for this country and region already exists.');
            }
        });
    }
}
