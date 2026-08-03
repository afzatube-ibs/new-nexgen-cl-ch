<?php

declare(strict_types=1);

namespace App\Domains\Platform\Installer\Http\Controllers;

use App\Domains\Platform\Installer\Actions\InstallAction;
use App\Domains\Platform\Installer\Http\Requests\InstallRequest;
use App\Domains\Platform\Installer\Http\Resources\InstallationResource;
use App\Domains\Platform\Installer\Models\Installation;
use Illuminate\Http\JsonResponse;

/**
 * Both actions here are deliberately outside `auth:sanctum` — see
 * InstallRequest::authorize()'s docblock. `store()` is the one HTTP
 * endpoint in this entire platform that creates a user account without an
 * authenticated, permission-checked caller, and it is only reachable at
 * all before the first successful install (InstallAction::execute()
 * refuses once platform_installations holds its one row).
 */
final class InstallController
{
    public function __construct(private readonly InstallAction $installAction) {}

    public function status(): JsonResponse
    {
        return response()->json([
            'data' => [
                'installed' => Installation::query()->exists(),
            ],
        ]);
    }

    public function store(InstallRequest $request): JsonResponse
    {
        $installation = $this->installAction->execute(
            administrator: $request->validated('admin'),
            store: $request->validated('store'),
        );

        return (new InstallationResource($installation))->response()->setStatusCode(201);
    }
}
