<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Http\Controllers;

use App\Domains\Commerce\Reviews\Actions\CreateReviewAction;
use App\Domains\Commerce\Reviews\Actions\DeleteReviewAction;
use App\Domains\Commerce\Reviews\Http\Requests\CreateReviewRequest;
use App\Domains\Commerce\Reviews\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Reviews\Http\Resources\ReviewResource;
use App\Domains\Commerce\Reviews\Models\Review;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

/**
 * `GET /reviews` is the one real dual-audience endpoint in this module: the
 * Gateway's fixed `storefront-service` credential (holding only
 * `reviews.reviews.view`) calls it with `?product_id=&status=approved` for
 * the real public listing, while staff moderators call it unfiltered (or
 * with `status=pending`) for the moderation queue — the same shape
 * `OrderController::index()` already uses for its own staff-vs-scoped-
 * caller split, just without a separate customer-only controller since
 * there is no "my reviews" self-service surface in this milestone's scope.
 */
final class ReviewController
{
    public function __construct(
        private readonly CreateReviewAction $createReviewAction,
        private readonly DeleteReviewAction $deleteReviewAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Review::query();

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->string('product_id')->toString());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->string('customer_id')->toString());
        }

        return ReviewResource::collection($query->orderByDesc('created_at')->paginate(perPage: (int) $request->integer('per_page', 20)));
    }

    public function show(Review $review): ReviewResource
    {
        return new ReviewResource($review);
    }

    /**
     * `customer.guard` — see Actions\CreateReviewAction's own docblock for
     * why this is customer-authenticated only, and this class's own
     * `callerId()`/`callerName()` docblock for why the authenticated
     * Customer principal is never imported as a concrete model here.
     */
    public function store(CreateReviewRequest $request): JsonResponse
    {
        $review = $this->createReviewAction->execute(
            attributes: $request->validated(),
            customerId: $this->callerId(),
            authorName: $this->callerName(),
        );

        return (new ReviewResource($review))->response()->setStatusCode(201);
    }

    /**
     * `reviews.reviews.manage` — staff-only removal for abuse/spam.
     */
    public function destroy(ExpectedVersionRequest $request, Review $review): Response
    {
        $this->deleteReviewAction->execute(
            review: $review,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }

    /**
     * Reads the authenticated principal via the generic `Guard`/`Model`
     * contracts rather than importing `Customers\Models\Customer` — this
     * module's one real, legitimate code-level dependency is Orders (a
     * narrow, read-only purchase-verification query at submission time),
     * mirroring Payments' own single-dependency precedent; the
     * `customer.guard` middleware already asserts the resolved principal
     * really is a Customer before this controller ever runs, so trusting
     * its id/name here through the generic contract adds no new coupling.
     */
    private function callerId(): string
    {
        $user = Auth::guard('sanctum')->user();

        abort_if($user === null, 401);

        return (string) $user->getAuthIdentifier();
    }

    private function callerName(): string
    {
        $user = Auth::guard('sanctum')->user();

        abort_if(! $user instanceof Model, 401);

        return (string) $user->getAttribute('name');
    }
}
