<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Http\Resources;

use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductSearchIndex
 */
final class ProductSearchResultResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // relevance_score is a raw SQL SELECT alias (Engines\
        // MySqlFullTextSearchEngine::search()'s BOOLEAN MODE path), never
        // a declared column/cast on Models\ProductSearchIndex — read via
        // getAttribute() rather than the magic `$this->relevance_score`
        // property both this resource and its underlying model would
        // otherwise expose, since PHPStan can't see a dynamic SELECT
        // alias as a real property.
        $relevanceScore = $this->resource->getAttribute('relevance_score');

        return [
            'productId' => $this->product_id,
            'sku' => $this->sku,
            'name' => $this->name,
            'brandId' => $this->brand_id,
            'publishedAt' => $this->published_at?->toIso8601String(),
            // Present only when the query used FULLTEXT relevance ranking
            // — absent on a filters-only browse or a short-term LIKE
            // fallback, per that engine's own docblock.
            'relevanceScore' => $this->when(
                $relevanceScore !== null,
                fn (): float => (float) $relevanceScore,
            ),
        ];
    }
}
