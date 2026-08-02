<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Controllers;

use App\Domains\Platform\IdentityAccess\Actions\AuthenticateUserAction;
use App\Domains\Platform\IdentityAccess\Exceptions\AuthenticationFailedException;
use App\Domains\Platform\IdentityAccess\Http\Requests\LoginRequest;
use App\Domains\Platform\IdentityAccess\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class AuthController
{
    public function __construct(private readonly AuthenticateUserAction $authenticateUserAction) {}

    /**
     * POST /api/v1/auth/login — issues a Sanctum bearer token. Per
     * API:AUTHENTICATION, this is the single point every subsequent
     * request's identity is established through.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->authenticateUserAction->execute(
                email: $request->string('email')->toString(),
                password: $request->string('password')->toString(),
                deviceName: $request->string('device_name')->toString(),
            );
        } catch (AuthenticationFailedException $e) {
            // API:ERROR_MODEL: a validation-shaped 422 so callers already
            // handling form-field errors don't need a special case, while
            // the message is deliberately generic per AuthenticateUserAction's
            // docblock — it never reveals which field was wrong.
            throw ValidationException::withMessages(['email' => [$e->getMessage()]]);
        }

        return (new UserResource($result['user']))
            ->additional(['meta' => ['token' => $result['token']->plainTextToken]])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * POST /api/v1/auth/logout — revokes only the token making this
     * request, never every session at once (see SessionController@revoke
     * for revoking a specific or another session).
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(status: 204);
    }

    public function me(Request $request): UserResource
    {
        $user = $request->user();
        abort_if($user === null, 401);

        return new UserResource($user->load('roles.permissions'));
    }
}
