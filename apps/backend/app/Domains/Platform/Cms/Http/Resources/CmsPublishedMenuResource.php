<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Resources;

use App\Domains\Platform\Cms\Models\CmsMenu;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CmsMenu */
final class CmsPublishedMenuResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $snapshot = $this->published_snapshot ?? [];

        return [
            'id' => $this->id,
            'handle' => $snapshot['handle'] ?? $this->handle,
            'title' => $snapshot['title'] ?? $this->title,
            'items' => $snapshot['items'] ?? [],
            'publishedAt' => $this->published_at?->toIso8601String(),
        ];
    }
}
