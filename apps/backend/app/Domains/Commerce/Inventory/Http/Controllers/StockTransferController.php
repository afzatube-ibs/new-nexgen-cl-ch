<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Controllers;

use App\Domains\Commerce\Inventory\Actions\CancelStockTransferAction;
use App\Domains\Commerce\Inventory\Actions\CompleteStockTransferAction;
use App\Domains\Commerce\Inventory\Actions\InitiateStockTransferAction;
use App\Domains\Commerce\Inventory\Http\Requests\InitiateStockTransferRequest;
use App\Domains\Commerce\Inventory\Http\Resources\StockTransferResource;
use App\Domains\Commerce\Inventory\Models\StockTransfer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class StockTransferController
{
    public function __construct(
        private readonly InitiateStockTransferAction $initiateStockTransferAction,
        private readonly CompleteStockTransferAction $completeStockTransferAction,
        private readonly CancelStockTransferAction $cancelStockTransferAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = StockTransfer::query()->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return StockTransferResource::collection($query->paginate());
    }

    public function show(StockTransfer $stockTransfer): StockTransferResource
    {
        return new StockTransferResource($stockTransfer);
    }

    public function store(InitiateStockTransferRequest $request): JsonResponse
    {
        $transfer = $this->initiateStockTransferAction->execute(
            fromWarehouseId: $request->string('from_warehouse_id')->toString(),
            toWarehouseId: $request->string('to_warehouse_id')->toString(),
            sku: $request->string('sku')->toString(),
            quantity: (int) $request->integer('quantity'),
            actorId: $request->user()?->id,
        );

        return (new StockTransferResource($transfer))->response()->setStatusCode(201);
    }

    public function complete(Request $request, StockTransfer $stockTransfer): StockTransferResource
    {
        $completed = $this->completeStockTransferAction->execute($stockTransfer, $request->user()?->id);

        return new StockTransferResource($completed);
    }

    public function cancel(Request $request, StockTransfer $stockTransfer): StockTransferResource
    {
        $cancelled = $this->cancelStockTransferAction->execute($stockTransfer, $request->user()?->id);

        return new StockTransferResource($cancelled);
    }
}
