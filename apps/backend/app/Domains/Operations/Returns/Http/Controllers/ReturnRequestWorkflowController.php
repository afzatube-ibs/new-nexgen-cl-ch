<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Controllers;

use App\Domains\Operations\Returns\Actions\ApproveReturnRequestAction;
use App\Domains\Operations\Returns\Actions\CancelReturnRequestAction;
use App\Domains\Operations\Returns\Actions\MarkReceivedAction;
use App\Domains\Operations\Returns\Actions\RejectReturnRequestAction;
use App\Domains\Operations\Returns\Actions\ResolveReturnRequestAction;
use App\Domains\Operations\Returns\Actions\SchedulePickupAction;
use App\Domains\Operations\Returns\Actions\StartInspectionAction;
use App\Domains\Operations\Returns\Http\Requests\ExpectedVersionRequest;
use App\Domains\Operations\Returns\Http\Requests\RejectReturnRequestRequest;
use App\Domains\Operations\Returns\Http\Requests\ResolveReturnRequestRequest;
use App\Domains\Operations\Returns\Http\Requests\SchedulePickupRequest;
use App\Domains\Operations\Returns\Http\Resources\ReturnRequestResource;
use App\Domains\Operations\Returns\Models\ReturnRequest;

/**
 * This module's Return Status Lifecycle, one HTTP action per transition —
 * mirrors Fulfillment's ShipmentWorkflowController pattern exactly.
 */
final class ReturnRequestWorkflowController
{
    public function __construct(
        private readonly ApproveReturnRequestAction $approveReturnRequestAction,
        private readonly RejectReturnRequestAction $rejectReturnRequestAction,
        private readonly CancelReturnRequestAction $cancelReturnRequestAction,
        private readonly SchedulePickupAction $schedulePickupAction,
        private readonly MarkReceivedAction $markReceivedAction,
        private readonly StartInspectionAction $startInspectionAction,
        private readonly ResolveReturnRequestAction $resolveReturnRequestAction,
    ) {}

    public function approve(ExpectedVersionRequest $request, ReturnRequest $returnRequest): ReturnRequestResource
    {
        $updated = $this->approveReturnRequestAction->execute(
            returnRequest: $returnRequest,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ReturnRequestResource($updated);
    }

    public function reject(RejectReturnRequestRequest $request, ReturnRequest $returnRequest): ReturnRequestResource
    {
        $updated = $this->rejectReturnRequestAction->execute(
            returnRequest: $returnRequest,
            reason: $request->string('reason')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ReturnRequestResource($updated);
    }

    public function cancel(ExpectedVersionRequest $request, ReturnRequest $returnRequest): ReturnRequestResource
    {
        $updated = $this->cancelReturnRequestAction->execute(
            returnRequest: $returnRequest,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ReturnRequestResource($updated);
    }

    public function schedulePickup(SchedulePickupRequest $request, ReturnRequest $returnRequest): ReturnRequestResource
    {
        $updated = $this->schedulePickupAction->execute(
            returnRequest: $returnRequest,
            providerCode: $request->string('provider_code')->toString() ?: null,
            trackingNumber: $request->string('tracking_number')->toString() ?: null,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ReturnRequestResource($updated);
    }

    public function markReceived(ExpectedVersionRequest $request, ReturnRequest $returnRequest): ReturnRequestResource
    {
        $updated = $this->markReceivedAction->execute(
            returnRequest: $returnRequest,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ReturnRequestResource($updated);
    }

    public function startInspection(ExpectedVersionRequest $request, ReturnRequest $returnRequest): ReturnRequestResource
    {
        $updated = $this->startInspectionAction->execute(
            returnRequest: $returnRequest,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ReturnRequestResource($updated);
    }

    public function resolve(ResolveReturnRequestRequest $request, ReturnRequest $returnRequest): ReturnRequestResource
    {
        $updated = $this->resolveReturnRequestAction->execute(
            returnRequest: $returnRequest,
            resolution: $request->string('resolution')->toString(),
            resolutionNotes: $request->string('resolution_notes')->toString() ?: null,
            resolutionDetails: $request->safe()->only(['payment_id', 'amount', 'currency_code', 'desired_sku', 'desired_description', 'desired_quantity']),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ReturnRequestResource($updated->load(['refundRequest', 'exchangeRequest']));
    }
}
