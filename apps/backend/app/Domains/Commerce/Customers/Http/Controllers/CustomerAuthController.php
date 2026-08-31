<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Controllers;

use App\Domains\Commerce\Customers\Actions\LoginCustomerAction;
use App\Domains\Commerce\Customers\Actions\RegisterCustomerAction;
use App\Domains\Commerce\Customers\Actions\UpdateCustomerProfileAction;
use App\Domains\Commerce\Customers\Exceptions\AuthenticationFailedException;
use App\Domains\Commerce\Customers\Http\Requests\LoginCustomerRequest;
use App\Domains\Commerce\Customers\Http\Requests\RegisterCustomerRequest;
use App\Domains\Commerce\Customers\Http\Requests\UpdateMyProfileRequest;
use App\Domains\Commerce\Customers\Http\Resources\CustomerResource;
use App\Domains\Commerce\Customers\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * real, self-service authentication surface Actions\
 * RegisterCustomerAction's own docblock named as future work. Every
 * method here is a genuinely new caller of already-existing Actions
 * (`RegisterCustomerAction`, `UpdateCustomerProfileAction`) plus the two
 * new ones this milestone adds (`LoginCustomerAction`, and logout inline
 * — see IdentityAccess's own AuthController::logout() for the identical,
 * intentionally un-abstracted precedent) — no business logic is
 * duplicated, only a new, public (register/login) or customer-scoped
 * (logout/me/update) HTTP surface over it.
 */
final class CustomerAuthController
{
    public function __construct(
        private readonly RegisterCustomerAction $registerCustomerAction,
        private readonly LoginCustomerAction $loginCustomerAction,
        private readonly UpdateCustomerProfileAction $updateCustomerProfileAction,
    ) {}

    /**
     * POST /api/v1/customers/register — real, public self-service
     * registration. `actorId: null` since no staff actor performed this
     * (see identity-access:create-service-account's own precedent for
     * self-service actions taking a null actor).
     */
    public function register(RegisterCustomerRequest $request): JsonResponse
    {
        $customer = $this->registerCustomerAction->execute(
            attributes: $request->validated(),
            actorId: null,
        );

        return (new CustomerResource($customer))->response()->setStatusCode(201);
    }

    /**
     * POST /api/v1/customers/login — issues a real Sanctum bearer token,
     * scoped to this Customer only (see Http\Middleware\
     * EnsureCustomerPrincipal for the enforcement that keeps it that way).
     */
    public function login(LoginCustomerRequest $request): JsonResponse
    {
        try {
            $result = $this->loginCustomerAction->execute(
                identifier: $request->string('identifier')->toString(),
                password: $request->string('password')->toString(),
                deviceName: $request->string('device_name')->toString(),
            );
        } catch (AuthenticationFailedException $e) {
            // API:ERROR_MODEL: a validation-shaped 422, message
            // deliberately generic — mirrors Identity & Access's own
            // AuthController::login() exactly.
            throw ValidationException::withMessages(['identifier' => [$e->getMessage()]]);
        }

        return (new CustomerResource($result['customer']))
            ->additional(['meta' => ['token' => $result['token']->plainTextToken]])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * POST /api/v1/customers/logout — revokes only the token making this
     * request, never every session at once.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(status: 204);
    }

    /**
     * GET /api/v1/customers/me — the caller's own profile. Guaranteed a
     * real `Customer` by EnsureCustomerPrincipal.
     */
    public function me(Request $request): CustomerResource
    {
        $customer = $this->caller();

        return new CustomerResource($customer->load('addresses'));
    }

    /**
     * PATCH /api/v1/customers/me — self-service profile update, reusing
     * the exact same Action the staff surface uses.
     */
    public function updateMe(UpdateMyProfileRequest $request): CustomerResource
    {
        $customer = $this->caller();

        $updated = $this->updateCustomerProfileAction->execute(
            customer: $customer,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $customer->id,
        );

        return new CustomerResource($updated);
    }

    /**
     * Resolved via the `sanctum` guard directly rather than
     * `Illuminate\Http\Request::user()` — see Http\Middleware\
     * EnsureCustomerPrincipal's own docblock for why static analysis
     * would otherwise narrow that call's return type to this platform's
     * other Authenticatable model (the staff `User`). Every route this
     * method is called from is already behind `customer.guard`, so this
     * is never actually null at runtime — but it's still typed
     * defensively rather than force-unwrapped, per this platform's own
     * "no unchecked null access" discipline.
     */
    private function caller(): Customer
    {
        $customer = Auth::guard('sanctum')->user();

        abort_if(! $customer instanceof Customer, 401);

        return $customer;
    }
}
