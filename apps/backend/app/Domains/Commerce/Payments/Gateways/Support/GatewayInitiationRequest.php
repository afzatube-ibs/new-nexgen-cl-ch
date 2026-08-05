<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways\Support;

/**
 * What Actions\InitiatePaymentAction hands to a Gateways\Contracts\
 * PaymentGatewayContract::initiate() call — deliberately carries only
 * payment-relevant figures already resolved by this module (amount,
 * currency), never anything Payments would need to calculate itself.
 */
final readonly class GatewayInitiationRequest
{
    public function __construct(
        public string $paymentId,
        public string $orderId,
        public string $amount,
        public string $currencyCode,
        public ?string $customerEmail,
        public ?string $customerPhone,
        public string $description,
        public string $successCallbackUrl,
        public string $failureCallbackUrl,
        public string $cancelCallbackUrl,
    ) {}
}
