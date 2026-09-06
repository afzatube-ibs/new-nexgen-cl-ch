<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Resources;

use App\Domains\Platform\Cms\Models\CmsPage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CmsPage */
final class CmsPublishedPageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $snapshot = $this->published_snapshot ?? [];

        return [
            'id' => $this->id,
            'slug' => $snapshot['slug'] ?? $this->slug,
            'title' => $snapshot['title'] ?? $this->title,
            'locale' => $snapshot['locale'] ?? $this->locale,
            'content' => $snapshot['content'] ?? [],
            'metaTitle' => $snapshot['meta_title'] ?? null,
            'metaDescription' => $snapshot['meta_description'] ?? null,
            'publishedAt' => $this->published_at?->toIso8601String(),
        ];
    }
}
