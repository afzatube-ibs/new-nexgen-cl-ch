<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Http\Controllers\PricesLookupController's input — the real, batched
 * companion to LookupPriceRequest. `skus` is a comma-separated string
 * (`?skus=SKU-1,SKU-2&currency_code=BDT`), not a repeated `skus[]=`
 * array param — the real Gateway caller is `BackendClient` (Category-A),
 * whose own query-building contract only ever sends flat string/number
 * values (`store-api-gateway/src/backend/client.ts`'s own `buildUrl`),
 * per this milestone's own "reuse existing BackendClient patterns" rule
 * rather than widening that shared client's own type for one route.
 */
final class LookupPricesRequest extends FormRequest
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
            'skus' => ['required', 'string', 'max:2000'],
            'currency_code' => ['required', 'string', 'size:3', new IsValidCurrencyCode],
        ];
    }

    /**
     * @return list<string>
     */
    public function skuList(): array
    {
        $skus = array_map(trim(...), explode(',', $this->string('skus')->toString()));

        return array_values(array_filter($skus, fn (string $sku): bool => $sku !== ''));
    }
}
