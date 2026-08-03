<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class UpdatePriceListEntryRequest extends FormRequest
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
        /** @var PriceList|null $priceList */
        $priceList = $this->route('priceList');

        return [
            'sku' => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('price_list_entries', 'sku')
                    ->where(fn ($query) => $query->where('price_list_id', $priceList?->id))
                    ->ignore($this->route('entry')),
            ],
            'base_price' => ['sometimes', 'numeric', 'min:0.01'],
            'compare_at_price' => ['sometimes', 'nullable', 'numeric', 'min:0.01'],
            'sale_price' => ['sometimes', 'nullable', 'numeric', 'min:0.01'],
            'sale_starts_at' => ['sometimes', 'nullable', 'date'],
            'sale_ends_at' => ['sometimes', 'nullable', 'date', 'after:sale_starts_at'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * "Price validation": sale_price must be strictly less than the
     * *effective* base_price — which, on a partial update, may come from
     * this request or from the entry's own current value when base_price
     * isn't part of this particular update. `lt:base_price` alone only
     * compares against the same request's payload, so a request that
     * updates only sale_price would otherwise validate against nothing.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->filled('sale_price')) {
                return;
            }

            /** @var PriceListEntry|null $entry */
            $entry = $this->route('entry');
            $effectiveBasePrice = $this->input('base_price', $entry?->base_price);

            if ($effectiveBasePrice !== null && (float) $this->input('sale_price') >= (float) $effectiveBasePrice) {
                $validator->errors()->add('sale_price', 'The sale price must be less than the base price.');
            }
        });
    }
}
