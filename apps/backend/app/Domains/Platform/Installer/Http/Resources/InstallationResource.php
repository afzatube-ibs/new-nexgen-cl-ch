<?php

declare(strict_types=1);

namespace App\Domains\Platform\Installer\Http\Resources;

use App\Domains\Platform\Installer\Models\Installation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Installation
 */
final class InstallationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'installedBy' => $this->installed_by,
            'installedAt' => $this->created_at->toIso8601String(),
        ];
    }
}
