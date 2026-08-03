<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Controllers;

use App\Domains\Commerce\Pricing\Actions\ArchiveTaxClassAction;
use App\Domains\Commerce\Pricing\Actions\CreateTaxClassAction;
use App\Domains\Commerce\Pricing\Actions\DeleteTaxClassAction;
use App\Domains\Commerce\Pricing\Actions\UpdateTaxClassAction;
use App\Domains\Commerce\Pricing\Http\Requests\CreateTaxClassRequest;
use App\Domains\Commerce\Pricing\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Pricing\Http\Requests\UpdateTaxClassRequest;
use App\Domains\Commerce\Pricing\Http\Resources\TaxClassResource;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class TaxClassController
{
    public function __construct(
        private readonly CreateTaxClassAction $createTaxClassAction,
        private readonly UpdateTaxClassAction $updateTaxClassAction,
        private readonly ArchiveTaxClassAction $archiveTaxClassAction,
        private readonly DeleteTaxClassAction $deleteTaxClassAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = TaxClass::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return TaxClassResource::collection($query->orderBy('name')->paginate());
    }

    public function show(TaxClass $taxClass): TaxClassResource
    {
        return new TaxClassResource($taxClass);
    }

    public function store(CreateTaxClassRequest $request): JsonResponse
    {
        $class = $this->createTaxClassAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new TaxClassResource($class))->response()->setStatusCode(201);
    }

    public function update(UpdateTaxClassRequest $request, TaxClass $taxClass): TaxClassResource
    {
        $updated = $this->updateTaxClassAction->execute(
            class: $taxClass,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new TaxClassResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, TaxClass $taxClass): TaxClassResource
    {
        $archived = $this->archiveTaxClassAction->execute(
            class: $taxClass,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new TaxClassResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, TaxClass $taxClass): Response
    {
        $this->deleteTaxClassAction->execute(
            class: $taxClass,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
