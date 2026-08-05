<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways\Contracts;

use App\Domains\Commerce\Payments\Gateways\Support\GatewayRefundResult;

/**
 * "Refund Extension Point" — the master plan names this explicitly for
 * bKash only ("Query Payment, Refund Extension Point" under its own
 * section), not as a Phase 1 capability every gateway or this module's
 * own Actions must expose end-to-end. A gateway MAY implement this
 * optional capability interface alongside PaymentGatewayContract when its
 * real API supports refunding; Gateways\BkashGateway does, with a genuine,
 * functional implementation — not a stub — but no Action, Controller, or
 * route in this module calls it yet. That absence is deliberate: full
 * refund workflow (partial refunds, refund-to-original-source accounting,
 * reconciliation) is Returns' concern per planning/IMPLEMENTATION_MASTER_
 * PLAN.md's own module list, exactly as Orders' docblock already
 * establishes for order-level refunds — this interface is the seam that
 * future module extends, not a reimplementation of it now.
 */
interface RefundableGateway
{
    public function refund(string $gatewayReference, string $amount, ?string $reason): GatewayRefundResult;
}
