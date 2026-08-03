<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Controllers;

use App\Domains\Commerce\Pricing\Actions\CreatePriceListEntryAction;
use App\Domains\Commerce\Pricing\Actions\DeletePriceListEntryAction;
use App\Domains\Commerce\Pricing\Actions\UpdatePriceListEntryAction;
use App\Domains\Commerce\Pricing\Http\Requests\CreatePriceListEntryRequest;
use App\Domains\Commerce\Pricing\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Pricing\Http\Requests\UpdatePriceListEntryRequest;
use App\Domains\Commerce\Pricing\Http\Resources\PriceListEntryResource;
use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

final class PriceListEntryController
{
    public function __construct(
        private readonly CreatePriceListEntryAction $createPriceListEntryAction,
        private readonly UpdatePriceListEntryAction $updatePriceListEntryAction,
        private readonly DeletePriceListEntryAction $deletePriceListEntryAction,
    ) {}

    public function store(CreatePriceListEntryRequest $request, PriceList $priceList): JsonResponse
    {
        $entry = $this->createPriceListEntryAction->execute(
            priceList: $priceList,
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new PriceListEntryResource($entry))->response()->setStatusCode(201);
    }

    public function update(UpdatePriceListEntryRequest $request, PriceList $priceList, PriceListEntry $entry): PriceListEntryResource
    {
        $updated = $this->updatePriceListEntryAction->execute(
            entry: $entry,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PriceListEntryResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, PriceList $priceList, PriceListEntry $entry): Response
    {
        $this->deletePriceListEntryAction->execute(
            entry: $entry,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
