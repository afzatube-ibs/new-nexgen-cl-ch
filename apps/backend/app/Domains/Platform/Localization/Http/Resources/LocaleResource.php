<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Http\Resources;

use App\Domains\Platform\Localization\Models\Locale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Locale
 */
final class LocaleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'nativeName' => $this->native_name,
            'isRtl' => $this->is_rtl,
            'isDefault' => $this->is_default,
            'status' => $this->status,
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
