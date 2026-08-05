<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Controllers\Webhooks;

use App\Domains\Commerce\Payments\Actions\ProcessGatewayWebhookAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles bKash's browser-redirect callback — see Gateways\BkashGateway's
 * docblock for why authenticity is established by re-querying bKash's own
 * API rather than by a payload signature. Deliberately unauthenticated
 * (see routes.php) but throttled — see Http\Controllers\Webhooks\
 * SslcommerzWebhookController's docblock for the shared rationale.
 */
final class BkashWebhookController
{
    public function __construct(private readonly ProcessGatewayWebhookAction $processGatewayWebhookAction) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->processGatewayWebhookAction->execute(
            gatewayCode: 'bkash',
            rawPayload: $request->getContent(),
            headers: $request->headers->all(),
        );

        return response()->json(['status' => 'received']);
    }
}
