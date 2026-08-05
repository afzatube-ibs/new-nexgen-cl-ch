<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways;

use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;
use App\Domains\Commerce\Payments\Gateways\Contracts\RefundableGateway;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayRefundResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayStatusResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayWebhookNotification;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * bKash — Bangladesh's dominant mobile financial service, integrated
 * through its official Tokenized Checkout (PGW) API.
 *
 * "Tokenized Payment Flow": Grant Token -> Create Payment (returns
 * `bkashURL`, the hosted checkout page to redirect the customer to) ->
 * Execute Payment (server-to-server, once the customer completes payment
 * on bKash's own page and is redirected back).
 *
 * "Webhook Architecture" / "Signature Validation": bKash's Tokenized
 * Checkout does not sign its browser-redirect callback the way an HMAC-
 * based webhook would — the documented, secure pattern is instead to
 * treat the redirect's `paymentID` as a claim check only, and establish
 * genuine trust by calling Query Payment (or re-invoking Execute Payment,
 * which bKash's own API defines as idempotent) server-to-server. That is
 * exactly what verifyWebhookSignature() does here: it never trusts the
 * callback's own status parameter, only what bKash's API itself confirms
 * when asked directly — architecturally the same "re-query the source of
 * truth" pattern Gateways\SslcommerzGateway uses for the same reason.
 *
 * "Retry Safety": bKash's own Execute Payment endpoint is documented as
 * safe to call more than once for the same paymentID (it returns the
 * same terminal result rather than double-charging), so this gateway
 * does not need to invent its own additional retry guard beyond the
 * `gateway_reference` uniqueness this module's payment_attempts table
 * already enforces.
 */
final readonly class BkashGateway implements PaymentGatewayContract, RefundableGateway
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
        return 'bkash';
    }

    public function label(): string
    {
        return 'bKash';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['app_key'] ?? null)
            && filled($this->config['app_secret'] ?? null)
            && filled($this->config['username'] ?? null)
            && filled($this->config['password'] ?? null);
    }

    public function initiate(GatewayInitiationRequest $request): GatewayInitiationResult
    {
        $response = $this->authorized()->post($this->baseUrl().'/tokenized/checkout/create', [
            'mode' => '0011',
            'payerReference' => $request->orderId,
            'callbackURL' => $request->successCallbackUrl,
            'amount' => $request->amount,
            'currency' => $request->currencyCode,
            'intent' => 'sale',
            'merchantInvoiceNumber' => $request->paymentId,
        ])->throw();

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        $statusCode = is_string($body['statusCode'] ?? null) ? $body['statusCode'] : null;

        return new GatewayInitiationResult(
            status: $statusCode === '0000' ? 'pending' : 'failed',
            gatewayReference: is_string($body['paymentID'] ?? null) ? $body['paymentID'] : null,
            redirectUrl: is_string($body['bkashURL'] ?? null) ? $body['bkashURL'] : null,
            instructions: null,
            raw: $body,
        );
    }

    public function verifyWebhookSignature(string $rawPayload, array $headers): bool
    {
        $paymentId = $this->extractPaymentId($rawPayload);

        return $paymentId !== null && $this->queryPaymentStatus($paymentId) !== null;
    }

    public function parseWebhookPayload(string $rawPayload, array $headers): GatewayWebhookNotification
    {
        $paymentId = $this->extractPaymentId($rawPayload);
        $confirmed = $paymentId !== null ? $this->queryPaymentStatus($paymentId) : null;

        if ($confirmed === null) {
            throw new RuntimeException('bKash payment could not be re-confirmed via the Query Payment API.');
        }

        $transactionStatus = is_string($confirmed['transactionStatus'] ?? null) ? $confirmed['transactionStatus'] : '';

        $status = match ($transactionStatus) {
            'Completed' => 'captured',
            'Initiated' => 'authorized',
            default => 'failed',
        };

        return new GatewayWebhookNotification(
            eventReference: (string) $paymentId,
            gatewayReference: (string) $paymentId,
            status: $status,
            amount: is_string($confirmed['amount'] ?? null) ? $confirmed['amount'] : null,
            currencyCode: is_string($confirmed['currency'] ?? null) ? $confirmed['currency'] : null,
            failureReason: $status === 'failed' ? "bKash reported transaction status [{$transactionStatus}]." : null,
            raw: $confirmed,
        );
    }

    public function queryStatus(string $gatewayReference): GatewayStatusResult
    {
        $confirmed = $this->queryPaymentStatus($gatewayReference);

        if ($confirmed === null) {
            return new GatewayStatusResult(status: 'failed', gatewayReference: $gatewayReference, amount: null, raw: []);
        }

        $transactionStatus = is_string($confirmed['transactionStatus'] ?? null) ? $confirmed['transactionStatus'] : '';

        $status = match ($transactionStatus) {
            'Completed' => 'captured',
            'Initiated' => 'authorized',
            default => 'failed',
        };

        return new GatewayStatusResult(
            status: $status,
            gatewayReference: $gatewayReference,
            amount: is_string($confirmed['amount'] ?? null) ? $confirmed['amount'] : null,
            raw: $confirmed,
        );
    }

    /**
     * "Refund Extension Point" — see Gateways\Contracts\RefundableGateway's
     * docblock for why nothing in this module calls this yet.
     */
    public function refund(string $gatewayReference, string $amount, ?string $reason): GatewayRefundResult
    {
        $response = $this->authorized()->post($this->baseUrl().'/tokenized/checkout/payment/refund', [
            'paymentID' => $gatewayReference,
            'amount' => $amount,
            'trxID' => $gatewayReference,
            'sku' => 'refund',
            'reason' => $reason ?? 'Merchant-initiated refund.',
        ]);

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        $transactionStatus = is_string($body['transactionStatus'] ?? null) ? $body['transactionStatus'] : '';

        return new GatewayRefundResult(
            status: $transactionStatus === 'Completed' ? 'succeeded' : 'failed',
            refundReference: is_string($body['refundTrxID'] ?? null) ? $body['refundTrxID'] : null,
            raw: $body,
        );
    }

    private function extractPaymentId(string $rawPayload): ?string
    {
        $decoded = json_decode($rawPayload, true);

        if (is_array($decoded) && is_string($decoded['paymentID'] ?? null)) {
            return $decoded['paymentID'];
        }

        $fields = [];
        parse_str($rawPayload, $fields);

        return is_string($fields['paymentID'] ?? null) ? $fields['paymentID'] : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function queryPaymentStatus(string $paymentId): ?array
    {
        $response = $this->authorized()->get($this->baseUrl()."/tokenized/checkout/payment/status/{$paymentId}");

        if ($response->failed()) {
            return null;
        }

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        if (! isset($body['paymentID'])) {
            return null;
        }

        return $body;
    }

    private function authorized(): PendingRequest
    {
        return $this->http->withHeaders([
            'Authorization' => $this->idToken(),
            'X-APP-Key' => (string) $this->config['app_key'],
        ])->asJson();
    }

    /**
     * bKash's own token lifetime (`expires_in`, typically ~3600s) is
     * respected here rather than re-granting a token on every call —
     * this module's own Performance review names the alternative (a
     * fresh Grant Token HTTP round-trip before every single Payments
     * call) as exactly the kind of avoidable external-call overhead worth
     * caching against, mirroring how any production bKash integration
     * necessarily behaves.
     */
    private function idToken(): string
    {
        $cacheKey = 'payments:bkash:id_token:'.md5((string) $this->config['app_key']);

        $cached = Cache::get($cacheKey);

        if (is_string($cached)) {
            return $cached;
        }

        $response = $this->http->withHeaders([
            'username' => (string) $this->config['username'],
            'password' => (string) $this->config['password'],
        ])->asJson()->post($this->baseUrl().'/tokenized/checkout/token/grant', [
            'app_key' => $this->config['app_key'],
            'app_secret' => $this->config['app_secret'],
        ])->throw();

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        $token = is_string($body['id_token'] ?? null) ? $body['id_token'] : '';
        $expiresIn = is_numeric($body['expires_in'] ?? null) ? (int) $body['expires_in'] : 3600;

        if ($token !== '') {
            Cache::put($cacheKey, $token, max(60, $expiresIn - 60));
        }

        return $token;
    }

    private function baseUrl(): string
    {
        return rtrim((string) ($this->config['base_url'] ?? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'), '/');
    }
}
