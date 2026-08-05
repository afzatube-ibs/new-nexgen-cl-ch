<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways;

use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayStatusResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayWebhookNotification;
use RuntimeException;

/**
 * Manual bank transfer — a first-class Bangladesh gateway. Like
 * Gateways\CodGateway, genuinely functional with no external network
 * call: the customer transfers funds directly to the configured bank
 * account outside this platform entirely, then this module's own
 * "Admin Verification" workflow (Http\Controllers\
 * BankTransferVerificationController, calling Actions\
 * CapturePaymentAction or Actions\MarkPaymentFailedAction exactly like
 * every other gateway's manual-capture path) is how a human confirms the
 * money actually arrived.
 *
 * `initiate()` generates a `payment_reference` the customer is instructed
 * to quote on their transfer, so a human reviewer can match an incoming
 * bank statement line back to this specific Payment. "Proof Upload
 * Extension Point": Models\Payment's own `proof_reference` column stores
 * an identifier-only reference to wherever the uploaded evidence file
 * actually lives (a future Media module attachment id) — this gateway
 * class never implements file storage itself, per this module's "MUST
 * NOT duplicate any business logic" rule; Http\Requests\
 * AttachBankTransferProofRequest only ever writes that one column.
 */
final readonly class BankTransferGateway implements PaymentGatewayContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config) {}

    public function code(): string
    {
        return 'bank_transfer';
    }

    public function label(): string
    {
        return 'Bank Transfer';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['bank_name'] ?? null)
            && filled($this->config['account_name'] ?? null)
            && filled($this->config['account_number'] ?? null);
    }

    public function initiate(GatewayInitiationRequest $request): GatewayInitiationResult
    {
        $reference = 'BT-'.strtoupper(substr(str_replace('-', '', $request->paymentId), 0, 12));

        $instructions = sprintf(
            'Transfer %s %s to %s (Account: %s, Bank: %s%s) and quote reference %s.',
            $request->currencyCode,
            $request->amount,
            $this->config['account_name'] ?? '',
            $this->config['account_number'] ?? '',
            $this->config['bank_name'] ?? '',
            filled($this->config['branch'] ?? null) ? ', Branch: '.$this->config['branch'] : '',
            $reference,
        );

        return new GatewayInitiationResult(
            status: 'pending',
            gatewayReference: $reference,
            redirectUrl: null,
            instructions: $instructions,
            raw: [],
        );
    }

    public function verifyWebhookSignature(string $rawPayload, array $headers): bool
    {
        // Bank Transfer has no external gateway and therefore no webhook
        // channel — verification here is always a human, through Admin
        // Verification, never an automated callback.
        return false;
    }

    public function parseWebhookPayload(string $rawPayload, array $headers): GatewayWebhookNotification
    {
        throw new RuntimeException('Bank Transfer does not support webhook notifications — see Admin Verification instead.');
    }

    public function queryStatus(string $gatewayReference): GatewayStatusResult
    {
        throw new RuntimeException('Bank Transfer has no external gateway to query — its status lives entirely in this module\'s own Payment record.');
    }
}
