<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Controllers;

use App\Domains\Commerce\Customers\Actions\ArchiveCustomerAction;
use App\Domains\Commerce\Customers\Actions\DeleteCustomerAction;
use App\Domains\Commerce\Customers\Actions\RegisterCustomerAction;
use App\Domains\Commerce\Customers\Actions\UpdateCustomerProfileAction;
use App\Domains\Commerce\Customers\Audit\AuditLogger;
use App\Domains\Commerce\Customers\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Customers\Http\Requests\RegisterCustomerRequest;
use App\Domains\Commerce\Customers\Http\Requests\UpdateCustomerProfileRequest;
use App\Domains\Commerce\Customers\Http\Resources\CustomerResource;
use App\Domains\Commerce\Customers\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * Staff-facing Customer CRUD — MODULE:CUSTOMERS' public contract, per
 * planning/IMPLEMENTATION_MASTER_PLAN.md ("Customer registration, profile,
 * address book"). Every action here is behind
 * `permission:customers.customers.*` middleware (see routes.php) — this
 * controller trusts that enforcement happened already, per
 * SECURITY:DEFENSE_IN_DEPTH.
 *
 * Reads are audited, not only mutations — customer data is Sensitive per
 * DATA:CLASSIFICATION, mirroring Identity & Access's own precedent for its
 * equally-Sensitive user data.
 */
final class CustomerController
{
    public function __construct(
        private readonly RegisterCustomerAction $registerCustomerAction,
        private readonly UpdateCustomerProfileAction $updateCustomerProfileAction,
        private readonly ArchiveCustomerAction $archiveCustomerAction,
        private readonly DeleteCustomerAction $deleteCustomerAction,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Customer::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $sortable = ['name', 'email', 'created_at'];
        $sort = $request->string('sort', 'created_at')->toString();
        $direction = $request->string('direction', 'desc')->toString() === 'asc' ? 'asc' : 'desc';
        $query->orderBy(in_array($sort, $sortable, true) ? $sort : 'created_at', $direction);

        $customers = $query->paginate(perPage: (int) $request->integer('per_page', 25));

        $this->auditLogger->log(action: 'customer.listed', actorId: $request->user()?->id);

        return CustomerResource::collection($customers);
    }

    public function show(Request $request, Customer $customer): CustomerResource
    {
        $this->auditLogger->log(
            action: 'customer.viewed',
            actorId: $request->user()?->id,
            targetType: Customer::class,
            targetId: $customer->id,
        );

        return new CustomerResource($customer->load('addresses'));
    }

    public function store(RegisterCustomerRequest $request): JsonResponse
    {
        $customer = $this->registerCustomerAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new CustomerResource($customer))->response()->setStatusCode(201);
    }

    public function update(UpdateCustomerProfileRequest $request, Customer $customer): CustomerResource
    {
        $updated = $this->updateCustomerProfileAction->execute(
            customer: $customer,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CustomerResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, Customer $customer): CustomerResource
    {
        $archived = $this->archiveCustomerAction->execute(
            customer: $customer,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CustomerResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Customer $customer): Response
    {
        $this->deleteCustomerAction->execute(
            customer: $customer,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }

    /**
     * DATA:IMPORT_EXPORT: "the module that owns a category of data is also
     * responsible for that data's import and export capability." Staff-
     * initiated for Phase 1 (e.g. a data-subject access request) — see
     * Actions\RegisterCustomerAction's docblock for why a customer
     * self-service export endpoint doesn't exist yet.
     */
    public function export(Request $request, Customer $customer): CustomerResource
    {
        $this->auditLogger->log(
            action: 'customer.exported',
            actorId: $request->user()?->id,
            targetType: Customer::class,
            targetId: $customer->id,
        );

        return new CustomerResource($customer->load('addresses'));
    }
}
