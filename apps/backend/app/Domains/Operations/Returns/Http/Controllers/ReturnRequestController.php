<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Controllers;

use App\Domains\Operations\Returns\Actions\CreateReturnRequestAction;
use App\Domains\Operations\Returns\Http\Requests\CreateReturnRequestRequest;
use App\Domains\Operations\Returns\Http\Resources\ReturnRequestResource;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ReturnRequestController
{
    public function __construct(private readonly CreateReturnRequestAction $createReturnRequestAction) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ReturnRequest::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->string('order_id')->toString());
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->string('customer_id')->toString());
        }

        return ReturnRequestResource::collection($query->orderByDesc('created_at')->paginate());
    }

    public function show(ReturnRequest $returnRequest): ReturnRequestResource
    {
        $returnRequest->load(['items', 'timelineEvents', 'notes', 'refundRequest', 'exchangeRequest']);

        return new ReturnRequestResource($returnRequest);
    }

    public function store(CreateReturnRequestRequest $request): JsonResponse
    {
        /** @var list<array{sku: string, description?: string|null, quantity: int}> $items */
        $items = $request->validated('items');

        $returnRequest = $this->createReturnRequestAction->execute(
            attributes: $request->safe()->except('items'),
            items: $items,
            actorId: $request->user()?->id,
        );

        return (new ReturnRequestResource($returnRequest->load('items')))->response()->setStatusCode(201);
    }
}
