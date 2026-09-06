<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Resources;

use App\Domains\Platform\Cms\Models\CmsPageRevision;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CmsPageRevision */
final class CmsPageRevisionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pageId' => $this->page_id,
            'snapshot' => $this->snapshot,
            'createdBy' => $this->created_by,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
