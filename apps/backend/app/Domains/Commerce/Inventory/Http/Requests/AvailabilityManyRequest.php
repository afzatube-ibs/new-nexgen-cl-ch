<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Batched Inventory availability read for server-side Storefront composition.
 * `skus` is deliberately a comma-separated query string so the Gateway can
 * reuse its existing read-only BackendClient without widening that shared
 * client to support repeated array query parameters.
 */
final class AvailabilityManyRequest extends FormRequest
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
        ];
    }

    /**
     * @return list<string>
     */
    public function skuList(): array
    {
        $skus = array_map(trim(...), explode(',', $this->string('skus')->toString()));
        $skus = array_values(array_filter($skus, fn (string $sku): bool => $sku !== ''));

        return array_values(array_unique(array_map(strtoupper(...), $skus)));
    }
}
