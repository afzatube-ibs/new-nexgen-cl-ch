<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\CalculateShippingRateAction every time a shipping
 * rate is successfully resolved — named explicitly in planning/
 * IMPLEMENTATION_MASTER_PLAN.md's Shipping & Logistics entry ("Events:
 * ShippingRateCalculated"). Per ARCH:CROSS_DOMAIN_COMMUNICATION, this is
 * the only channel through which a Commerce-domain module (e.g. a future
 * Checkout revision) could ever observe a Shipping computation — direct,
 * in-process cross-domain calls are forbidden by MODULE:INTERACTION_RULES
 * regardless of read/write intent.
 */
final class ShippingRateCalculated extends DomainEvent
{
    public function __construct(
        public readonly string $shippingMethodId,
        public readonly ?string $shippingZoneId,
        public readonly int $weightGrams,
        public readonly string $amount,
        public readonly string $currencyCode,
        ?string $correlationId = null,
        ?string $tenantId = null,
    ) {
        parent::__construct($correlationId, $tenantId);
    }

    public function name(): string
    {
        return 'shipping.rate_calculated';
    }
}
