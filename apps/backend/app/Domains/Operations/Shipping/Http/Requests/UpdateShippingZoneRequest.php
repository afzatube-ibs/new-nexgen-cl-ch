<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Requests;

use App\Domains\Operations\Shipping\Models\ShippingZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class UpdateShippingZoneRequest extends FormRequest
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
     * See CreateShippingZoneRequest's docblock for why (country_code,
     * region) uniqueness is checked here rather than via a `Rule::unique`
     * column rule.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->hasAny(['country_code', 'region']) || $validator->errors()->has('country_code')) {
                return;
            }

            /** @var ShippingZone|null $zone */
            $zone = $this->route('shippingZone');
            $countryCode = strtoupper((string) $this->input('country_code', $zone?->country_code));
            $region = (string) $this->input('region', $zone?->region);

            $query = ShippingZone::query()
                ->where('country_code', $countryCode)
                ->where('region', $region);

            if ($zone !== null) {
                $query->where('id', '!=', $zone->id);
            }

            if ($query->exists()) {
                $validator->errors()->add('country_code', 'A shipping zone for this country and region already exists.');
            }
        });
    }
}
