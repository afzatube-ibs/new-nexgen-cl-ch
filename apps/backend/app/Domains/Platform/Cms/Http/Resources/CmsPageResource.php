<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class CmsPageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'storeId' => $this->store_id,
            'slug' => $this->slug,
            'title' => $this->title,
            'locale' => $this->locale,
            'content' => $this->content,
            'metaTitle' => $this->meta_title,
            'metaDescription' => $this->meta_description,
            'status' => $this->status,
            'isPublished' => $this->status === 'published' && $this->published_snapshot !== null,
            'publishedAt' => $this->published_at?->toIso8601String(),
            'lockVersion' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
