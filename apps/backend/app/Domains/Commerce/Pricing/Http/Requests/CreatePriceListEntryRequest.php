<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use App\Domains\Commerce\Pricing\Models\PriceList;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * "Price validation": `sale_price` must be strictly less than
 * `base_price` when both are given (a "sale" priced at or above the
 * standing price is not a sale), and `sale_ends_at` must fall after
 * `sale_starts_at` when both are given, using Laravel's built-in `lt`/
 * `after` field-comparison rules rather than custom validation code.
 */
final class CreatePriceListEntryRequest extends FormRequest
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
                'required',
                'string',
                'max:100',
                Rule::unique('price_list_entries', 'sku')
                    ->where(fn ($query) => $query->where('price_list_id', $priceList?->id)),
            ],
            'base_price' => ['required', 'numeric', 'min:0.01'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0.01'],
            'sale_price' => ['nullable', 'numeric', 'min:0.01', 'lt:base_price'],
            'sale_starts_at' => ['nullable', 'date'],
            'sale_ends_at' => ['nullable', 'date', 'after:sale_starts_at'],
        ];
    }
}
