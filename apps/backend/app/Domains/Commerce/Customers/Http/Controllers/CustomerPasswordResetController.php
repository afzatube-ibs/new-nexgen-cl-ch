<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Controllers;

use App\Domains\Commerce\Customers\Actions\RequestPasswordResetAction;
use App\Domains\Commerce\Customers\Actions\ResetPasswordAction;
use App\Domains\Commerce\Customers\Exceptions\PasswordResetFailedException;
use App\Domains\Commerce\Customers\Http\Requests\RequestPasswordResetRequest;
use App\Domains\Commerce\Customers\Http\Requests\ResetPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset) — the
 * real, public (pre-authentication) surface for both steps. `forgot()`
 * always answers with the identical response regardless of whether the
 * email matched a real account (see RequestPasswordResetAction's own
 * docblock) — the caller-visible contract this platform's own anti-
 * enumeration discipline requires.
 */
final class CustomerPasswordResetController
{
    public function __construct(
        private readonly RequestPasswordResetAction $requestPasswordResetAction,
        private readonly ResetPasswordAction $resetPasswordAction,
    ) {}

    /** POST /api/v1/customers/password/forgot */
    public function forgot(RequestPasswordResetRequest $request): JsonResponse
    {
        $this->requestPasswordResetAction->execute($request->string('email')->toString());

        return response()->json([
            'data' => ['message' => 'If that email has an account, a password reset link was sent.'],
        ]);
    }

    /** POST /api/v1/customers/password/reset */
    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        try {
            $this->resetPasswordAction->execute(
                email: $request->string('email')->toString(),
                plainTextToken: $request->string('token')->toString(),
                newPassword: $request->string('password')->toString(),
            );
        } catch (PasswordResetFailedException $e) {
            throw ValidationException::withMessages(['token' => [$e->getMessage()]]);
        }

        return response()->json(['data' => ['message' => 'Your password has been reset.']]);
    }
}
