<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates GET /api/v1/search/products' query parameters. `q` is
 * intentionally optional — see Engines\Support\SearchQuery's own
 * docblock for why an empty term is a legitimate "browse with filters"
 * request, not an error.
 */
final class SearchProductsRequest extends FormRequest
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
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'brand_id' => ['sometimes', 'nullable', 'string', 'uuid'],
            'sort' => ['sometimes', 'string', 'in:relevance,name,published_at,created_at'],
            'direction' => ['sometimes', 'string', 'in:asc,desc'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
