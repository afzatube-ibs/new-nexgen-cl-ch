<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Http\Controllers;

use App\Domains\Platform\Localization\Actions\ArchiveCurrencyAction;
use App\Domains\Platform\Localization\Actions\CreateCurrencyAction;
use App\Domains\Platform\Localization\Actions\DeleteCurrencyAction;
use App\Domains\Platform\Localization\Actions\UpdateCurrencyAction;
use App\Domains\Platform\Localization\Http\Requests\CreateCurrencyRequest;
use App\Domains\Platform\Localization\Http\Requests\ExpectedVersionRequest;
use App\Domains\Platform\Localization\Http\Requests\UpdateCurrencyRequest;
use App\Domains\Platform\Localization\Http\Resources\CurrencyResource;
use App\Domains\Platform\Localization\Models\Currency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class CurrencyController
{
    public function __construct(
        private readonly CreateCurrencyAction $createCurrencyAction,
        private readonly UpdateCurrencyAction $updateCurrencyAction,
        private readonly ArchiveCurrencyAction $archiveCurrencyAction,
        private readonly DeleteCurrencyAction $deleteCurrencyAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Currency::query()->orderBy('code');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return CurrencyResource::collection($query->paginate());
    }

    public function show(Currency $currency): CurrencyResource
    {
        return new CurrencyResource($currency);
    }

    public function store(CreateCurrencyRequest $request): JsonResponse
    {
        $currency = $this->createCurrencyAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new CurrencyResource($currency))->response()->setStatusCode(201);
    }

    public function update(UpdateCurrencyRequest $request, Currency $currency): CurrencyResource
    {
        $updated = $this->updateCurrencyAction->execute(
            currency: $currency,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CurrencyResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, Currency $currency): CurrencyResource
    {
        $archived = $this->archiveCurrencyAction->execute(
            currency: $currency,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CurrencyResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Currency $currency): Response
    {
        $this->deleteCurrencyAction->execute(
            currency: $currency,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
