<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Controllers;

use App\Domains\Operations\Returns\Actions\CancelExchangeRequestAction;
use App\Domains\Operations\Returns\Actions\CompleteExchangeRequestAction;
use App\Domains\Operations\Returns\Actions\MarkExchangeShippedAction;
use App\Domains\Operations\Returns\Actions\StartExchangePreparingAction;
use App\Domains\Operations\Returns\Http\Requests\ExpectedVersionRequest;
use App\Domains\Operations\Returns\Http\Requests\MarkExchangeShippedRequest;
use App\Domains\Operations\Returns\Http\Resources\ExchangeRequestResource;
use App\Domains\Operations\Returns\Models\ExchangeRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ExchangeRequestController
{
    public function __construct(
        private readonly StartExchangePreparingAction $startExchangePreparingAction,
        private readonly MarkExchangeShippedAction $markExchangeShippedAction,
        private readonly CompleteExchangeRequestAction $completeExchangeRequestAction,
        private readonly CancelExchangeRequestAction $cancelExchangeRequestAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ExchangeRequest::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return ExchangeRequestResource::collection($query->orderByDesc('created_at')->paginate());
    }

    public function show(ExchangeRequest $exchangeRequest): ExchangeRequestResource
    {
        return new ExchangeRequestResource($exchangeRequest);
    }

    public function startPreparing(ExpectedVersionRequest $request, ExchangeRequest $exchangeRequest): ExchangeRequestResource
    {
        $updated = $this->startExchangePreparingAction->execute(
            exchangeRequest: $exchangeRequest,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ExchangeRequestResource($updated);
    }

    public function markShipped(MarkExchangeShippedRequest $request, ExchangeRequest $exchangeRequest): ExchangeRequestResource
    {
        $updated = $this->markExchangeShippedAction->execute(
            exchangeRequest: $exchangeRequest,
            trackingNumber: $request->string('tracking_number')->toString() ?: null,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ExchangeRequestResource($updated);
    }

    public function complete(ExpectedVersionRequest $request, ExchangeRequest $exchangeRequest): ExchangeRequestResource
    {
        $updated = $this->completeExchangeRequestAction->execute(
            exchangeRequest: $exchangeRequest,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ExchangeRequestResource($updated);
    }

    public function cancel(ExpectedVersionRequest $request, ExchangeRequest $exchangeRequest): ExchangeRequestResource
    {
        $updated = $this->cancelExchangeRequestAction->execute(
            exchangeRequest: $exchangeRequest,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ExchangeRequestResource($updated);
    }
}
