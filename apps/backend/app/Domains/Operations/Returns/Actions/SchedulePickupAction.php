<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Exceptions\ReturnValidationException;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use App\Domains\Operations\Shipping\Couriers\ProviderRegistry;
use Illuminate\Support\Facades\DB;

/**
 * "Courier collection must use the Shipping provider contract" — Returns
 * and Shipping are both Operations-domain modules, so this Action reads
 * Shipping's own Couriers\ProviderRegistry directly (a same-domain
 * "direct call," permitted per MODULE:INTERACTION_RULES, mirroring
 * Fulfillment's identically-reasoned same-domain dependency on the same
 * registry).
 *
 * Deliberately does not call Couriers\Contracts\ShippingProviderContract
 * ::bookShipment() the way Fulfillment's DispatchShipmentAction does:
 * that method's Support\ShipmentBookingRequest shape, and every courier's
 * real documented endpoint behind it, is built for an outbound "create
 * consignment to a recipient" call — none of the six couriers' publicly
 * available documentation (see config/shipping.php's own docblock)
 * distinguishes a genuine reverse-pickup endpoint from that same forward
 * shape, and fabricating one here would misrepresent an unverified
 * integration as real, per PRINCIPLES:EXPLICIT_FAILURE. Instead, this
 * Action validates the chosen provider is genuinely registered and
 * available (real use of the same contract/registry Shipping owns) and
 * records the collection via an operator-supplied reference — the same,
 * already-established "manual dispatch" pattern Fulfillment's own
 * DispatchShipmentAction uses for couriers/methods that do not support
 * automated booking. A genuine reverse-pickup API integration is a
 * well-scoped Future Extension Point once a specific courier's own
 * documented pickup endpoint can be verified, exactly like Payments' own
 * named-but-unbuilt COD extension points.
 */
final readonly class SchedulePickupAction
{
    public function __construct(
        private AuditLogger $auditLogger,
        private ProviderRegistry $providerRegistry,
    ) {}

    public function execute(
        ReturnRequest $returnRequest,
        ?string $providerCode,
        ?string $trackingNumber,
        int $expectedVersion,
        ?string $actorId,
    ): ReturnRequest {
        if ($providerCode !== null) {
            $provider = $this->providerRegistry->get($providerCode);

            if ($provider === null || ! $provider->isAvailable()) {
                throw new ReturnValidationException('courier_unavailable', "Courier [{$providerCode}] is not registered or is not currently available.");
            }
        }

        return DB::transaction(function () use ($returnRequest, $providerCode, $trackingNumber, $expectedVersion, $actorId) {
            $returnRequest->assertVersionMatches($expectedVersion);
            $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_PICKUP_SCHEDULED);

            $returnRequest->status = ReturnRequest::STATUS_PICKUP_SCHEDULED;
            $returnRequest->pickup_provider_code = $providerCode;
            $returnRequest->pickup_tracking_number = $trackingNumber;
            $returnRequest->pickup_scheduled_at = now();
            $returnRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => $providerCode !== null
                    ? "Pickup scheduled with {$providerCode}.".($trackingNumber !== null ? " Tracking: {$trackingNumber}." : '')
                    : 'Pickup scheduled.',
                'occurred_at' => $returnRequest->pickup_scheduled_at,
            ]);

            $this->auditLogger->log(
                action: 'return_request.pickup_scheduled',
                actorId: $actorId,
                targetType: ReturnRequest::class,
                targetId: $returnRequest->id,
                after: $returnRequest->only(['status', 'pickup_provider_code', 'pickup_tracking_number']),
            );

            return $returnRequest;
        });
    }
}
