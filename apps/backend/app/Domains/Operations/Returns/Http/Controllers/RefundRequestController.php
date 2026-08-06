<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Controllers;

use App\Domains\Operations\Returns\Actions\RetryRefundRequestAction;
use App\Domains\Operations\Returns\Http\Resources\RefundRequestResource;
use App\Domains\Operations\Returns\Models\RefundRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class RefundRequestController
{
    public function __construct(private readonly RetryRefundRequestAction $retryRefundRequestAction) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = RefundRequest::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return RefundRequestResource::collection($query->orderByDesc('requested_at')->paginate());
    }

    public function show(RefundRequest $refundRequest): RefundRequestResource
    {
        return new RefundRequestResource($refundRequest);
    }

    public function retry(RefundRequest $refundRequest): RefundRequestResource
    {
        return new RefundRequestResource($this->retryRefundRequestAction->execute($refundRequest));
    }
}
