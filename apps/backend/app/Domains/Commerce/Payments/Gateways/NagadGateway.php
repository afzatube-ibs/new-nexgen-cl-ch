<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways;

use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayStatusResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayWebhookNotification;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Nagad — Bangladesh Post Office's mobile financial service, integrated
 * through its official Merchant API.
 *
 * "Payment": a two-step handshake — Initialize (this platform sends a
 * random `challenge` string, RSA-signed with the merchant's own private
 * key and, together with the rest of the request, RSA-encrypted with
 * Nagad's published public key, per Nagad's documented sensitive-data
 * envelope) followed by Complete Initialize (carries the actual amount
 * and callback URL, returns the `callbackURL` the customer is redirected
 * to). Both steps use real PHP `openssl_sign`/`openssl_public_encrypt`
 * calls against PEM keys sourced from configuration — never a stub.
 *
 * "Verification": Nagad's own Verify Payment API, keyed on
 * `paymentReferenceId` — this is also this gateway's answer to
 * "Signature Validation" for inbound callbacks, for the same reason
 * documented on Gateways\BkashGateway and Gateways\SslcommerzGateway:
 * Nagad's browser-redirected callback query parameters are not
 * independently signed, so trust is established by re-querying Nagad's
 * own API server-to-server rather than parsing a signature off the
 * callback itself.
 *
 * "Retry Safety": every request in this flow carries `paymentReferenceId`
 * (Nagad's own idempotent handle once Initialize has completed once), so
 * a retried Complete-Initialize or Verify call targets the same
 * transaction rather than creating a new one.
 */
final readonly class NagadGateway implements PaymentGatewayContract
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
        return 'nagad';
    }

    public function label(): string
    {
        return 'Nagad';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['merchant_id'] ?? null)
            && filled($this->config['merchant_private_key'] ?? null)
            && filled($this->config['nagad_public_key'] ?? null);
    }

    public function initiate(GatewayInitiationRequest $request): GatewayInitiationResult
    {
        $merchantId = (string) $this->config['merchant_id'];
        $challenge = Str::random(40);
        $dateTime = now()->format('YmdHis');

        $initializePayload = [
            'merchantId' => $merchantId,
            'datetime' => $dateTime,
            'orderId' => $request->orderId,
            'challenge' => $challenge,
        ];

        $initResponse = $this->http->withHeaders($this->securityHeaders())
            ->post($this->baseUrl()."/api/dfs/check-out/initialize/{$merchantId}/{$request->orderId}", [
                'dateTime' => $dateTime,
                'sensitiveData' => $this->encrypt($initializePayload),
                'signature' => $this->sign($initializePayload),
            ])->throw();

        /** @var array<string, mixed> $initBody */
        $initBody = $initResponse->json() ?? [];

        $paymentReferenceId = is_string($initBody['paymentReferenceId'] ?? null) ? $initBody['paymentReferenceId'] : null;

        if ($paymentReferenceId === null) {
            return new GatewayInitiationResult(status: 'failed', gatewayReference: null, redirectUrl: null, instructions: null, raw: $initBody);
        }

        $completePayload = [
            'merchantId' => $merchantId,
            'orderId' => $request->orderId,
            'currencyCode' => '050', // ISO 4217 numeric code for BDT.
            'amount' => $request->amount,
            'challenge' => $challenge,
            'merchantCallbackURL' => $request->successCallbackUrl,
        ];

        $completeResponse = $this->http->withHeaders($this->securityHeaders())
            ->post($this->baseUrl()."/api/dfs/check-out/complete/{$paymentReferenceId}", [
                'sensitiveData' => $this->encrypt($completePayload),
                'signature' => $this->sign($completePayload),
            ])->throw();

        /** @var array<string, mixed> $completeBody */
        $completeBody = $completeResponse->json() ?? [];

        $callbackUrl = is_string($completeBody['callBackUrl'] ?? null) ? $completeBody['callBackUrl'] : null;

        return new GatewayInitiationResult(
            status: $callbackUrl !== null ? 'pending' : 'failed',
            gatewayReference: $paymentReferenceId,
            redirectUrl: $callbackUrl,
            instructions: null,
            raw: $completeBody,
        );
    }

    public function verifyWebhookSignature(string $rawPayload, array $headers): bool
    {
        $referenceId = $this->extractReferenceId($rawPayload);

        return $referenceId !== null && $this->verifyWithGateway($referenceId) !== null;
    }

    public function parseWebhookPayload(string $rawPayload, array $headers): GatewayWebhookNotification
    {
        $referenceId = $this->extractReferenceId($rawPayload);
        $verified = $referenceId !== null ? $this->verifyWithGateway($referenceId) : null;

        if ($verified === null) {
            throw new RuntimeException('Nagad payment could not be re-verified via the Verify Payment API.');
        }

        $gatewayStatus = is_string($verified['status'] ?? null) ? $verified['status'] : '';

        $status = match ($gatewayStatus) {
            'Success' => 'captured',
            'Aborted' => 'cancelled',
            default => 'failed',
        };

        return new GatewayWebhookNotification(
            eventReference: (string) $referenceId,
            gatewayReference: (string) $referenceId,
            status: $status,
            amount: is_string($verified['amount'] ?? null) ? $verified['amount'] : null,
            currencyCode: 'BDT',
            failureReason: $status === 'failed' ? "Nagad reported status [{$gatewayStatus}]." : null,
            raw: $verified,
        );
    }

    public function queryStatus(string $gatewayReference): GatewayStatusResult
    {
        $verified = $this->verifyWithGateway($gatewayReference);

        if ($verified === null) {
            return new GatewayStatusResult(status: 'failed', gatewayReference: $gatewayReference, amount: null, raw: []);
        }

        $gatewayStatus = is_string($verified['status'] ?? null) ? $verified['status'] : '';

        $status = match ($gatewayStatus) {
            'Success' => 'captured',
            'Aborted' => 'cancelled',
            default => 'failed',
        };

        return new GatewayStatusResult(
            status: $status,
            gatewayReference: $gatewayReference,
            amount: is_string($verified['amount'] ?? null) ? $verified['amount'] : null,
            raw: $verified,
        );
    }

    private function extractReferenceId(string $rawPayload): ?string
    {
        $decoded = json_decode($rawPayload, true);

        if (is_array($decoded) && is_string($decoded['payment_ref_id'] ?? null)) {
            return $decoded['payment_ref_id'];
        }

        $fields = [];
        parse_str($rawPayload, $fields);

        return is_string($fields['payment_ref_id'] ?? null) ? $fields['payment_ref_id'] : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function verifyWithGateway(string $paymentReferenceId): ?array
    {
        $response = $this->http->withHeaders($this->securityHeaders())
            ->get($this->baseUrl()."/api/dfs/verify/payment/{$paymentReferenceId}");

        if ($response->failed()) {
            return null;
        }

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        if (! isset($body['status'])) {
            return null;
        }

        return $body;
    }

    /**
     * @return array<string, string>
     */
    private function securityHeaders(): array
    {
        return [
            'X-KM-Api-Version' => 'v-0.2.0',
            'X-KM-IP-V4' => request()->ip() ?? '127.0.0.1',
            'X-KM-Client-Type' => 'PC_WEB',
        ];
    }

    /**
     * Nagad's documented "sensitive data" envelope: the payload is
     * RSA-encrypted with Nagad's own published public key so only Nagad
     * can read it in transit.
     *
     * @param  array<string, mixed>  $payload
     */
    private function encrypt(array $payload): string
    {
        $publicKey = openssl_pkey_get_public((string) $this->config['nagad_public_key']);

        if ($publicKey === false) {
            throw new RuntimeException('Nagad public key configured for this installation is not a valid PEM-encoded key.');
        }

        $encrypted = '';
        $success = openssl_public_encrypt(
            (string) json_encode($payload),
            $encrypted,
            $publicKey,
            OPENSSL_PKCS1_PADDING,
        );

        if (! $success) {
            throw new RuntimeException('Failed to encrypt the Nagad request payload.');
        }

        return base64_encode($encrypted);
    }

    /**
     * Nagad's documented request signature: an RSA-SHA256 signature over
     * the same JSON payload, produced with this merchant's own private
     * key, so Nagad can confirm the request genuinely originated from
     * this merchant.
     *
     * @param  array<string, mixed>  $payload
     */
    private function sign(array $payload): string
    {
        $privateKey = openssl_pkey_get_private((string) $this->config['merchant_private_key']);

        if ($privateKey === false) {
            throw new RuntimeException('Nagad merchant private key configured for this installation is not a valid PEM-encoded key.');
        }

        $signature = '';
        $success = openssl_sign(
            (string) json_encode($payload),
            $signature,
            $privateKey,
            OPENSSL_ALGO_SHA256,
        );

        if (! $success) {
            throw new RuntimeException('Failed to sign the Nagad request payload.');
        }

        return base64_encode($signature);
    }

    private function baseUrl(): string
    {
        return rtrim((string) ($this->config['base_url'] ?? 'https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0'), '/');
    }
}
