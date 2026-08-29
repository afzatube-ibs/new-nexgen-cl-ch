<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Controllers;

use App\Domains\Commerce\Customers\Actions\AddCustomerAddressAction;
use App\Domains\Commerce\Customers\Actions\DeleteCustomerAddressAction;
use App\Domains\Commerce\Customers\Actions\UpdateCustomerAddressAction;
use App\Domains\Commerce\Customers\Http\Requests\AddCustomerAddressRequest;
use App\Domains\Commerce\Customers\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Customers\Http\Requests\UpdateCustomerAddressRequest;
use App\Domains\Commerce\Customers\Http\Resources\CustomerAddressResource;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Customers\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — a
 * customer's own address book, reusing the exact same Actions
 * CustomerAddressController (staff) already uses. The staff surface binds
 * both `{customer}` and `{address}` from the route and trusts they are
 * already consistent (correct there — a staff caller building the URL is
 * presumed to already know which address belongs to which customer). This
 * self-service surface CANNOT make that assumption: `{address}` alone is
 * bound from the route, so `assertOwnedByCaller()` is a real, load-bearing
 * check here — without it, a customer who obtained another customer's
 * (UUID, therefore practically unguessable, but never assumed-safe per
 * SECURITY:AUTHORIZATION) address id could edit or delete it.
 */
final class CustomerSelfAddressController
{
    public function __construct(
        private readonly AddCustomerAddressAction $addCustomerAddressAction,
        private readonly UpdateCustomerAddressAction $updateCustomerAddressAction,
        private readonly DeleteCustomerAddressAction $deleteCustomerAddressAction,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        $customer = $this->caller();

        return CustomerAddressResource::collection($customer->addresses()->orderByDesc('created_at')->get());
    }

    public function store(AddCustomerAddressRequest $request): JsonResponse
    {
        $customer = $this->caller();

        $address = $this->addCustomerAddressAction->execute(
            customer: $customer,
            attributes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $customer->id,
        );

        return (new CustomerAddressResource($address))->response()->setStatusCode(201);
    }

    public function update(UpdateCustomerAddressRequest $request, CustomerAddress $address): CustomerAddressResource
    {
        $customer = $this->caller();
        $this->assertOwnedByCaller($customer, $address);

        $updated = $this->updateCustomerAddressAction->execute(
            customer: $customer,
            address: $address,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $customer->id,
        );

        return new CustomerAddressResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, CustomerAddress $address): Response
    {
        $customer = $this->caller();
        $this->assertOwnedByCaller($customer, $address);

        $this->deleteCustomerAddressAction->execute(
            customer: $customer,
            address: $address,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $customer->id,
        );

        return response()->noContent();
    }

    /**
     * See Http\Controllers\CustomerAuthController::caller()'s own docblock
     * for why this reads the `sanctum` guard directly.
     */
    private function caller(): Customer
    {
        $customer = Auth::guard('sanctum')->user();

        abort_if(! $customer instanceof Customer, 401);

        return $customer;
    }

    /**
     * A 404, not a 403: this endpoint never confirms or denies that
     * another customer's address exists, per the same "an authorization
     * denial must never leak information the caller isn't entitled to"
     * principle Orders' own CustomerOrderController::show() applies.
     */
    private function assertOwnedByCaller(Customer $customer, CustomerAddress $address): void
    {
        abort_if($address->customer_id !== $customer->id, 404);
    }
}
