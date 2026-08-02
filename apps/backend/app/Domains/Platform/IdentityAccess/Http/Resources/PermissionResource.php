<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Resources;

use App\Domains\Platform\IdentityAccess\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Permission
 */
final class PermissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'key' => $this->key,
            'label' => $this->label,
            'module' => $this->module,
        ];
    }
}
