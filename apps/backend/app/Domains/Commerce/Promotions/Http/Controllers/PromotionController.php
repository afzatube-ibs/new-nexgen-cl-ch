<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Controllers;

use App\Domains\Commerce\Promotions\Actions\ArchivePromotionAction;
use App\Domains\Commerce\Promotions\Actions\CreatePromotionAction;
use App\Domains\Commerce\Promotions\Actions\DeletePromotionAction;
use App\Domains\Commerce\Promotions\Actions\UpdatePromotionAction;
use App\Domains\Commerce\Promotions\Http\Requests\CreatePromotionRequest;
use App\Domains\Commerce\Promotions\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Promotions\Http\Requests\UpdatePromotionRequest;
use App\Domains\Commerce\Promotions\Http\Resources\PromotionResource;
use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * Staff-facing Promotion CRUD — MODULE:PROMOTIONS' public contract, per
 * planning/IMPLEMENTATION_MASTER_PLAN.md. Every action here is behind
 * `permission:promotions.promotions.*` middleware (see routes.php).
 */
final class PromotionController
{
    public function __construct(
        private readonly CreatePromotionAction $createPromotionAction,
        private readonly UpdatePromotionAction $updatePromotionAction,
        private readonly ArchivePromotionAction $archivePromotionAction,
        private readonly DeletePromotionAction $deletePromotionAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Promotion::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('discount_type')) {
            $query->where('discount_type', $request->string('discount_type')->toString());
        }

        return PromotionResource::collection($query->orderBy('priority', 'desc')->orderBy('name')->paginate());
    }

    public function show(Promotion $promotion): PromotionResource
    {
        return new PromotionResource($promotion->load(['conditions', 'coupons']));
    }

    public function store(CreatePromotionRequest $request): JsonResponse
    {
        $promotion = $this->createPromotionAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new PromotionResource($promotion))->response()->setStatusCode(201);
    }

    public function update(UpdatePromotionRequest $request, Promotion $promotion): PromotionResource
    {
        $updated = $this->updatePromotionAction->execute(
            promotion: $promotion,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PromotionResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, Promotion $promotion): PromotionResource
    {
        $archived = $this->archivePromotionAction->execute(
            promotion: $promotion,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PromotionResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Promotion $promotion): Response
    {
        $this->deletePromotionAction->execute(
            promotion: $promotion,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
