<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Controllers;

use App\Domains\Platform\IdentityAccess\Http\Resources\PermissionResource;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Read-only, per permissions migration's docblock: the catalog is
 * code-registered, never admin-created — this controller exists only so
 * the admin surface can list available permissions when composing a role.
 */
final class PermissionController
{
    public function index(): AnonymousResourceCollection
    {
        return PermissionResource::collection(
            Permission::query()->orderBy('module')->orderBy('key')->get()
        );
    }
}
