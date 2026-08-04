<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Controllers;

use App\Domains\Commerce\Promotions\Actions\AddPromotionConditionAction;
use App\Domains\Commerce\Promotions\Actions\DeletePromotionConditionAction;
use App\Domains\Commerce\Promotions\Actions\UpdatePromotionConditionAction;
use App\Domains\Commerce\Promotions\Http\Requests\AddPromotionConditionRequest;
use App\Domains\Commerce\Promotions\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Promotions\Http\Requests\UpdatePromotionConditionRequest;
use App\Domains\Commerce\Promotions\Http\Resources\PromotionConditionResource;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

final class PromotionConditionController
{
    public function __construct(
        private readonly AddPromotionConditionAction $addPromotionConditionAction,
        private readonly UpdatePromotionConditionAction $updatePromotionConditionAction,
        private readonly DeletePromotionConditionAction $deletePromotionConditionAction,
    ) {}

    public function store(AddPromotionConditionRequest $request, Promotion $promotion): JsonResponse
    {
        $condition = $this->addPromotionConditionAction->execute(
            promotion: $promotion,
            attributes: $request->validated(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return (new PromotionConditionResource($condition))->response()->setStatusCode(201);
    }

    public function update(UpdatePromotionConditionRequest $request, Promotion $promotion, PromotionCondition $condition): PromotionConditionResource
    {
        $updated = $this->updatePromotionConditionAction->execute(
            promotion: $promotion,
            condition: $condition,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PromotionConditionResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, Promotion $promotion, PromotionCondition $condition): Response
    {
        $this->deletePromotionConditionAction->execute(
            promotion: $promotion,
            condition: $condition,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
