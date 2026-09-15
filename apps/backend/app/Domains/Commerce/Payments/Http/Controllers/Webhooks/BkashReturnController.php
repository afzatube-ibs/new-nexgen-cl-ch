<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Controllers\Webhooks;

use App\Domains\Commerce\Payments\Actions\ProcessGatewayWebhookAction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** Processes bKash's browser GET callback, then returns the shopper to the storefront receipt. */
final class BkashReturnController
{
    public function __construct(private readonly ProcessGatewayWebhookAction $processGatewayWebhookAction) {}

    public function __invoke(Request $request): RedirectResponse
    {
        $this->processGatewayWebhookAction->execute(
            gatewayCode: 'bkash',
            rawPayload: http_build_query($request->query()),
            headers: $request->headers->all(),
        );

        $returnUrl = (string) config('payments.checkout_return_url');
        $separator = str_contains($returnUrl, '?') ? '&' : '?';

        return redirect()->away($returnUrl.$separator.'payment_return=bkash');
    }
}
