<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Controllers;

use App\Domains\Commerce\Pricing\Actions\ArchiveTaxZoneAction;
use App\Domains\Commerce\Pricing\Actions\CreateTaxZoneAction;
use App\Domains\Commerce\Pricing\Actions\DeleteTaxZoneAction;
use App\Domains\Commerce\Pricing\Actions\UpdateTaxZoneAction;
use App\Domains\Commerce\Pricing\Http\Requests\CreateTaxZoneRequest;
use App\Domains\Commerce\Pricing\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Pricing\Http\Requests\UpdateTaxZoneRequest;
use App\Domains\Commerce\Pricing\Http\Resources\TaxZoneResource;
use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class TaxZoneController
{
    public function __construct(
        private readonly CreateTaxZoneAction $createTaxZoneAction,
        private readonly UpdateTaxZoneAction $updateTaxZoneAction,
        private readonly ArchiveTaxZoneAction $archiveTaxZoneAction,
        private readonly DeleteTaxZoneAction $deleteTaxZoneAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = TaxZone::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return TaxZoneResource::collection($query->orderBy('country_code')->orderBy('region')->paginate());
    }

    public function show(TaxZone $taxZone): TaxZoneResource
    {
        return new TaxZoneResource($taxZone);
    }

    public function store(CreateTaxZoneRequest $request): JsonResponse
    {
        $zone = $this->createTaxZoneAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new TaxZoneResource($zone))->response()->setStatusCode(201);
    }

    public function update(UpdateTaxZoneRequest $request, TaxZone $taxZone): TaxZoneResource
    {
        $updated = $this->updateTaxZoneAction->execute(
            zone: $taxZone,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new TaxZoneResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, TaxZone $taxZone): TaxZoneResource
    {
        $archived = $this->archiveTaxZoneAction->execute(
            zone: $taxZone,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new TaxZoneResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, TaxZone $taxZone): Response
    {
        $this->deleteTaxZoneAction->execute(
            zone: $taxZone,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
