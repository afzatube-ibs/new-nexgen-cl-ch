<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Controllers;

use App\Domains\Commerce\Pricing\Actions\ArchiveTaxRateAction;
use App\Domains\Commerce\Pricing\Actions\CreateTaxRateAction;
use App\Domains\Commerce\Pricing\Actions\DeleteTaxRateAction;
use App\Domains\Commerce\Pricing\Actions\UpdateTaxRateAction;
use App\Domains\Commerce\Pricing\Http\Requests\CreateTaxRateRequest;
use App\Domains\Commerce\Pricing\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Pricing\Http\Requests\UpdateTaxRateRequest;
use App\Domains\Commerce\Pricing\Http\Resources\TaxRateResource;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class TaxRateController
{
    public function __construct(
        private readonly CreateTaxRateAction $createTaxRateAction,
        private readonly UpdateTaxRateAction $updateTaxRateAction,
        private readonly ArchiveTaxRateAction $archiveTaxRateAction,
        private readonly DeleteTaxRateAction $deleteTaxRateAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = TaxRate::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('tax_zone_id')) {
            $query->where('tax_zone_id', $request->string('tax_zone_id')->toString());
        }

        if ($request->filled('tax_class_id')) {
            $query->where('tax_class_id', $request->string('tax_class_id')->toString());
        }

        return TaxRateResource::collection($query->paginate());
    }

    public function show(TaxRate $taxRate): TaxRateResource
    {
        return new TaxRateResource($taxRate);
    }

    public function store(CreateTaxRateRequest $request): JsonResponse
    {
        $rate = $this->createTaxRateAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new TaxRateResource($rate))->response()->setStatusCode(201);
    }

    public function update(UpdateTaxRateRequest $request, TaxRate $taxRate): TaxRateResource
    {
        $updated = $this->updateTaxRateAction->execute(
            rate: $taxRate,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new TaxRateResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, TaxRate $taxRate): TaxRateResource
    {
        $archived = $this->archiveTaxRateAction->execute(
            rate: $taxRate,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new TaxRateResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, TaxRate $taxRate): Response
    {
        $this->deleteTaxRateAction->execute(
            rate: $taxRate,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
