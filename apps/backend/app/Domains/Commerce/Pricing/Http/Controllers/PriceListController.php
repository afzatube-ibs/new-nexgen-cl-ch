<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Controllers;

use App\Domains\Commerce\Pricing\Actions\ArchivePriceListAction;
use App\Domains\Commerce\Pricing\Actions\CreatePriceListAction;
use App\Domains\Commerce\Pricing\Actions\DeletePriceListAction;
use App\Domains\Commerce\Pricing\Actions\UpdatePriceListAction;
use App\Domains\Commerce\Pricing\Http\Requests\CreatePriceListRequest;
use App\Domains\Commerce\Pricing\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Pricing\Http\Requests\UpdatePriceListRequest;
use App\Domains\Commerce\Pricing\Http\Resources\PriceListResource;
use App\Domains\Commerce\Pricing\Models\PriceList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * Staff-facing PriceList CRUD — MODULE:PRICING's public contract, per
 * planning/IMPLEMENTATION_MASTER_PLAN.md ("Price lookup" is a distinct
 * endpoint — see PriceLookupController). Every action here is behind
 * `permission:pricing.price_lists.*` middleware (see routes.php).
 */
final class PriceListController
{
    public function __construct(
        private readonly CreatePriceListAction $createPriceListAction,
        private readonly UpdatePriceListAction $updatePriceListAction,
        private readonly ArchivePriceListAction $archivePriceListAction,
        private readonly DeletePriceListAction $deletePriceListAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PriceList::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('currency_code')) {
            $query->where('currency_code', strtoupper($request->string('currency_code')->toString()));
        }

        return PriceListResource::collection($query->orderBy('name')->paginate());
    }

    public function show(PriceList $priceList): PriceListResource
    {
        return new PriceListResource($priceList->load('entries'));
    }

    public function store(CreatePriceListRequest $request): JsonResponse
    {
        $priceList = $this->createPriceListAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new PriceListResource($priceList))->response()->setStatusCode(201);
    }

    public function update(UpdatePriceListRequest $request, PriceList $priceList): PriceListResource
    {
        $updated = $this->updatePriceListAction->execute(
            priceList: $priceList,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PriceListResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, PriceList $priceList): PriceListResource
    {
        $archived = $this->archivePriceListAction->execute(
            priceList: $priceList,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PriceListResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, PriceList $priceList): Response
    {
        $this->deletePriceListAction->execute(
            priceList: $priceList,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
