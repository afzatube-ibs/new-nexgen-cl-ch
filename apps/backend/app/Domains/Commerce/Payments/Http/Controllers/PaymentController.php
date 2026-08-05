<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Controllers;

use App\Domains\Commerce\Payments\Actions\InitiatePaymentAction;
use App\Domains\Commerce\Payments\Http\Requests\InitiatePaymentRequest;
use App\Domains\Commerce\Payments\Http\Resources\PaymentResource;
use App\Domains\Commerce\Payments\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * "Payment Authorization"'s entry point and lookup surface — MODULE:
 * PAYMENTS' public contract for starting and reviewing a payment. Every
 * action here is behind `permission:payments.payments.*` middleware (see
 * routes.php).
 */
final class PaymentController
{
    public function __construct(private readonly InitiatePaymentAction $initiatePaymentAction) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Payment::query();

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->string('order_id')->toString());
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->string('customer_id')->toString());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return PaymentResource::collection($query->orderByDesc('initiated_at')->paginate());
    }

    public function show(Payment $payment): PaymentResource
    {
        return new PaymentResource($payment->load('attempts'));
    }

    /**
     * Returns a plain PaymentResource rather than an explicit status code:
     * Laravel's JsonResource::toResponse() automatically renders 201 when
     * the wrapped model's `wasRecentlyCreated` is true (a genuinely new
     * payment) and 200 otherwise (an idempotent retry returning the
     * existing Payment) — exactly the behavior "Idempotent checkout
     * submission" already relies on in Checkout's own submission
     * controller, reused here rather than reimplemented.
     */
    public function store(InitiatePaymentRequest $request): PaymentResource
    {
        $payment = $this->initiatePaymentAction->execute(
            orderId: $request->string('order_id')->toString(),
            gatewayCode: $request->string('gateway_code')->toString(),
            idempotencyKey: $request->string('idempotency_key')->toString(),
            actorId: $request->user()?->id,
        );

        return new PaymentResource($payment->load('attempts'));
    }
}
