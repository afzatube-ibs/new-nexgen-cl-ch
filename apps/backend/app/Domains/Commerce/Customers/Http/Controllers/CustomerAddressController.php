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
use Illuminate\Http\Response;

/**
 * Address-book management within a Customer aggregate — see the
 * customer_addresses migration's docblock for why every action here takes
 * the owning Customer's `expected_version`, not the address row's own.
 * Behind `permission:customers.customers.manage` (see routes.php): address
 * mutation is part of the same aggregate CustomerController manages, not a
 * separately permissioned capability.
 */
final class CustomerAddressController
{
    public function __construct(
        private readonly AddCustomerAddressAction $addCustomerAddressAction,
        private readonly UpdateCustomerAddressAction $updateCustomerAddressAction,
        private readonly DeleteCustomerAddressAction $deleteCustomerAddressAction,
    ) {}

    public function store(AddCustomerAddressRequest $request, Customer $customer): JsonResponse
    {
        $address = $this->addCustomerAddressAction->execute(
            customer: $customer,
            attributes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return (new CustomerAddressResource($address))->response()->setStatusCode(201);
    }

    public function update(UpdateCustomerAddressRequest $request, Customer $customer, CustomerAddress $address): CustomerAddressResource
    {
        $updated = $this->updateCustomerAddressAction->execute(
            customer: $customer,
            address: $address,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CustomerAddressResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, Customer $customer, CustomerAddress $address): Response
    {
        $this->deleteCustomerAddressAction->execute(
            customer: $customer,
            address: $address,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
