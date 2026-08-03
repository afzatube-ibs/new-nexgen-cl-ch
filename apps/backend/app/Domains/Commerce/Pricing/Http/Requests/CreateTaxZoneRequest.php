<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class CreateTaxZoneRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'country_code' => ['required', 'string', 'regex:/^[A-Z]{2}$/i'],
            'region' => ['sometimes', 'string', 'max:100'],
        ];
    }

    /**
     * (country_code, region) uniqueness is checked here rather than via a
     * `Rule::unique` column rule, since the constraint spans two fields
     * with a normalized value ('' for country-wide) neither field alone
     * expresses — see the tax_zones migration's docblock.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->has('country_code')) {
                return;
            }

            $countryCode = strtoupper((string) $this->input('country_code'));
            $region = (string) $this->input('region', '');

            $exists = TaxZone::query()
                ->where('country_code', $countryCode)
                ->where('region', $region)
                ->exists();

            if ($exists) {
                $validator->errors()->add('country_code', 'A tax zone for this country and region already exists.');
            }
        });
    }
}
