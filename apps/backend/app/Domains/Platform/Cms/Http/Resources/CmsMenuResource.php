<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Resources;

use App\Domains\Platform\Cms\Models\CmsMenu;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CmsMenu */
final class CmsMenuResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'storeId' => $this->store_id,
            'handle' => $this->handle,
            'title' => $this->title,
            'items' => $this->items,
            'status' => $this->status,
            'isPublished' => $this->status === CmsMenu::STATUS_PUBLISHED && $this->published_snapshot !== null,
            'publishedAt' => $this->published_at?->toIso8601String(),
            'lockVersion' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
