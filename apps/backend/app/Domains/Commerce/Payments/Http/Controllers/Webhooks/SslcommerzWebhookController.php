<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Controllers\Webhooks;

use App\Domains\Commerce\Payments\Actions\ProcessGatewayWebhookAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles SSLCommerz's Success, Failure, Cancel, and IPN callbacks — all
 * four carry the same field shape (see Gateways\SslcommerzGateway's
 * docblock for why one controller/action handles all four rather than
 * four separate code paths). Deliberately unauthenticated (see routes.php
 * — no `auth:sanctum`, SSLCommerz's own servers cannot present a Sanctum
 * token) but throttled; the real authentication mechanism is Actions\
 * ProcessGatewayWebhookAction's own signature verification, per
 * SECURITY:SECURITY_BOUNDARIES' external-integration boundary.
 *
 * Always responds 200 regardless of outcome (rejected, unmatched,
 * duplicate, or processed) — SSLCommerz's own retry behavior for a
 * non-200 response would otherwise re-deliver a callback this module has
 * already durably recorded, which Actions\ProcessGatewayWebhookAction's
 * replay protection already handles correctly on its own; there is
 * nothing SSLCommerz can usefully do differently in response to an error
 * status here.
 */
final class SslcommerzWebhookController
{
    public function __construct(private readonly ProcessGatewayWebhookAction $processGatewayWebhookAction) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->processGatewayWebhookAction->execute(
            gatewayCode: 'sslcommerz',
            rawPayload: $request->getContent(),
            headers: $request->headers->all(),
        );

        return response()->json(['status' => 'received']);
    }
}
