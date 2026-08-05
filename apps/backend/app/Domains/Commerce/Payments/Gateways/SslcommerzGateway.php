<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways;

use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayStatusResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayWebhookNotification;
use Illuminate\Http\Client\Factory as HttpFactory;
use RuntimeException;

/**
 * SSLCommerz — Bangladesh's most widely integrated aggregator gateway
 * (cards, mobile banking, and net banking behind one hosted checkout).
 * Real, functional HTTP calls against SSLCommerz's own documented Session
 * (init) and Order Validation APIs, gated by `isAvailable()` on
 * `store_id`/`store_password` being configured — never a fake success
 * when credentials are absent.
 *
 * "Hosted Checkout": initiate() POSTs to the Session API and returns the
 * `GatewayPageURL` SSLCommerz's response carries, which is where the
 * caller redirects the customer.
 *
 * "Success Callback / Failure Callback / Cancel Callback / IPN": all four
 * arrive at this platform as HTTP requests carrying the same field shape
 * (`tran_id`, `val_id`, `status`, ...) — Http\Controllers\Webhooks\
 * SslcommerzWebhookController routes every one of them through the same
 * Actions\ProcessGatewayWebhookAction, since SSLCommerz's own `status`
 * field (VALID/FAILED/CANCELLED) already discriminates which of the four
 * this is; this module does not need four different code paths for what
 * is structurally one notification.
 *
 * "Signature Verification": SSLCommerz's browser-redirected callback
 * parameters are, by SSLCommerz's own design, not something a merchant
 * should trust standalone — the documented, safe pattern is re-confirming
 * server-to-server via the Order Validation API keyed on `val_id`, which
 * is exactly what verifyWebhookSignature() does here (the same "trust
 * comes from re-querying the source of truth" pattern Gateways\
 * BkashGateway uses, not a payload-signing scheme, because SSLCommerz
 * genuinely does not offer one for this flow).
 */
final readonly class SslcommerzGateway implements PaymentGatewayContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(
        private array $config,
        private HttpFactory $http,
    ) {}

    public function code(): string
    {
        return 'sslcommerz';
    }

    public function label(): string
    {
        return 'SSLCommerz';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['store_id'] ?? null) && filled($this->config['store_password'] ?? null);
    }

    public function initiate(GatewayInitiationRequest $request): GatewayInitiationResult
    {
        $response = $this->http->asForm()->post($this->baseUrl().'/gwprocess/v4/api.php', [
            'store_id' => $this->config['store_id'],
            'store_passwd' => $this->config['store_password'],
            'total_amount' => $request->amount,
            'currency' => $request->currencyCode,
            'tran_id' => $request->paymentId,
            'success_url' => $request->successCallbackUrl,
            'fail_url' => $request->failureCallbackUrl,
            'cancel_url' => $request->cancelCallbackUrl,
            'ipn_url' => $request->successCallbackUrl,
            'cus_name' => $request->customerEmail ?? 'Customer',
            'cus_email' => $request->customerEmail ?? 'customer@example.com',
            'cus_phone' => $request->customerPhone ?? 'N/A',
            'cus_add1' => 'N/A',
            'cus_city' => 'N/A',
            'cus_country' => 'Bangladesh',
            'shipping_method' => 'NO',
            'product_name' => $request->description,
            'product_category' => 'General',
            'product_profile' => 'general',
        ])->throw();

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        $status = ($body['status'] ?? null) === 'SUCCESS' ? 'pending' : 'failed';

        return new GatewayInitiationResult(
            status: $status,
            // `tran_id` — the merchant transaction id WE chose above,
            // fixed to $request->paymentId — not SSLCommerz's own
            // `sessionkey` (present only in this init response, never
            // in the callback) or `val_id` (present only in the
            // callback, never here). `tran_id` is the one identifier
            // SSLCommerz's own design guarantees round-trips through
            // every callback (Success/Failure/Cancel/IPN), which is
            // exactly why it exists — this is what lets
            // Actions\ProcessGatewayWebhookAction's PaymentAttempt
            // lookup (keyed on gateway_code + gateway_reference)
            // resolve a later webhook back to this same Payment.
            gatewayReference: $request->paymentId,
            redirectUrl: is_string($body['GatewayPageURL'] ?? null) ? $body['GatewayPageURL'] : null,
            instructions: null,
            raw: $body,
        );
    }

    public function verifyWebhookSignature(string $rawPayload, array $headers): bool
    {
        $fields = [];
        parse_str($rawPayload, $fields);

        $valId = $fields['val_id'] ?? null;

        if (! is_string($valId) || $valId === '') {
            return false;
        }

        return $this->validateWithGateway($valId) !== null;
    }

    public function parseWebhookPayload(string $rawPayload, array $headers): GatewayWebhookNotification
    {
        $fields = [];
        parse_str($rawPayload, $fields);

        $valId = is_string($fields['val_id'] ?? null) ? $fields['val_id'] : null;
        $validated = $valId !== null ? $this->validateWithGateway($valId) : null;

        if ($validated === null) {
            throw new RuntimeException('SSLCommerz webhook payload could not be re-validated against the Order Validation API.');
        }

        $gatewayStatus = is_string($validated['status'] ?? null) ? strtoupper($validated['status']) : '';

        $status = match (true) {
            in_array($gatewayStatus, ['VALID', 'VALIDATED'], true) => 'captured',
            $gatewayStatus === 'CANCELLED' => 'cancelled',
            default => 'failed',
        };

        return new GatewayWebhookNotification(
            eventReference: (string) $valId,
            gatewayReference: is_string($fields['tran_id'] ?? null) ? $fields['tran_id'] : null,
            status: $status,
            amount: is_string($validated['amount'] ?? null) ? $validated['amount'] : null,
            currencyCode: is_string($validated['currency'] ?? null) ? $validated['currency'] : null,
            failureReason: $status === 'failed' ? "SSLCommerz reported status [{$gatewayStatus}]." : null,
            raw: $validated,
        );
    }

    public function queryStatus(string $gatewayReference): GatewayStatusResult
    {
        $validated = $this->validateWithGateway($gatewayReference);

        if ($validated === null) {
            return new GatewayStatusResult(status: 'failed', gatewayReference: $gatewayReference, amount: null, raw: []);
        }

        $gatewayStatus = is_string($validated['status'] ?? null) ? strtoupper($validated['status']) : '';

        $status = match (true) {
            in_array($gatewayStatus, ['VALID', 'VALIDATED'], true) => 'captured',
            $gatewayStatus === 'CANCELLED' => 'cancelled',
            default => 'failed',
        };

        return new GatewayStatusResult(
            status: $status,
            gatewayReference: $gatewayReference,
            amount: is_string($validated['amount'] ?? null) ? $validated['amount'] : null,
            raw: $validated,
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    private function validateWithGateway(string $valId): ?array
    {
        $response = $this->http->get($this->baseUrl().'/validator/api/validationserverAPI.php', [
            'val_id' => $valId,
            'store_id' => $this->config['store_id'],
            'store_passwd' => $this->config['store_password'],
            'format' => 'json',
        ]);

        if ($response->failed()) {
            return null;
        }

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        $status = is_string($body['status'] ?? null) ? strtoupper($body['status']) : '';

        if (! in_array($status, ['VALID', 'VALIDATED', 'FAILED', 'CANCELLED'], true)) {
            return null;
        }

        return $body;
    }

    private function baseUrl(): string
    {
        return rtrim((string) ($this->config['base_url'] ?? 'https://sandbox.sslcommerz.com'), '/');
    }
}
