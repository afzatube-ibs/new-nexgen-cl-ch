<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Http\Controllers;

use App\Domains\Commerce\Reviews\Actions\ApproveReviewAction;
use App\Domains\Commerce\Reviews\Actions\RejectReviewAction;
use App\Domains\Commerce\Reviews\Actions\RespondToReviewAction;
use App\Domains\Commerce\Reviews\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Reviews\Http\Requests\RejectReviewRequest;
use App\Domains\Commerce\Reviews\Http\Requests\RespondToReviewRequest;
use App\Domains\Commerce\Reviews\Http\Resources\ReviewResource;
use App\Domains\Commerce\Reviews\Models\Review;

/**
 * This module's moderation/merchant-response actions, one HTTP action per
 * operation — mirrors Returns' own ReturnRequestWorkflowController pattern
 * exactly.
 */
final class ReviewWorkflowController
{
    public function __construct(
        private readonly ApproveReviewAction $approveReviewAction,
        private readonly RejectReviewAction $rejectReviewAction,
        private readonly RespondToReviewAction $respondToReviewAction,
    ) {}

    /** `reviews.reviews.moderate` */
    public function approve(ExpectedVersionRequest $request, Review $review): ReviewResource
    {
        $updated = $this->approveReviewAction->execute(
            review: $review,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ReviewResource($updated);
    }

    /** `reviews.reviews.moderate` */
    public function reject(RejectReviewRequest $request, Review $review): ReviewResource
    {
        $updated = $this->rejectReviewAction->execute(
            review: $review,
            reason: $request->string('reason')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ReviewResource($updated);
    }

    /** `reviews.reviews.manage` */
    public function respond(RespondToReviewRequest $request, Review $review): ReviewResource
    {
        $actorId = $request->user()?->id;

        abort_if($actorId === null, 401);

        $updated = $this->respondToReviewAction->execute(
            review: $review,
            body: $request->string('body')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $actorId,
        );

        return new ReviewResource($updated);
    }
}
