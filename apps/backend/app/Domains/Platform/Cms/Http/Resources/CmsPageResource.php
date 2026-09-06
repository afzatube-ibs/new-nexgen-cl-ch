<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Resources;

use App\Domains\Platform\Cms\Models\CmsPage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CmsPage */
final class CmsPageResource extends JsonResource
{
    /** @return array<string, mixed> */
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
            'isPublished' => $this->status === CmsPage::STATUS_PUBLISHED && $this->published_snapshot !== null,
            'publishedAt' => $this->published_at?->toIso8601String(),
            'lockVersion' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
