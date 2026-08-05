<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Events\ShipmentDispatched as ShipmentDispatchedEvent;
use App\Domains\Operations\Fulfillment\Exceptions\ShipmentValidationException;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use App\Domains\Operations\Shipping\Couriers\ProviderRegistry;
use App\Domains\Operations\Shipping\Couriers\Support\ShipmentBookingRequest;
use App\Domains\Operations\Shipping\Exceptions\CourierBookingFailedException;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * "Fulfillment MUST use Shipping's provider contract. No courier-specific
 * business logic inside Fulfillment" — the entire courier hand-off lives
 * here as a single call to Couriers\ProviderRegistry/Contracts\
 * ShippingProviderContract::bookShipment(); this class never branches on
 * which concrete courier it is talking to, exactly like Payments' own
 * Actions never branch on which concrete PaymentGatewayContract they hold.
 *
 * `shipping_method_id` is read directly from Shipping's own ShippingMethod
 * model — a same-domain (Operations-Operations) direct call, permitted per
 * MODULE:INTERACTION_RULES and precedented by Payments' own narrow,
 * same-domain read of Orders' `grand_total` (see Actions\
 * InitiatePaymentAction's docblock) — never a foreign key (see the
 * shipments migration's docblock).
 *
 * Two dispatch paths, both legitimate, never a silent fallback between
 * them:
 * - **Courier-booked**: the resolved ShippingMethod names a provider that
 *   supports booking and is available — Couriers\ProviderRegistry
 *   resolves it and this Action calls bookShipment(), storing whatever
 *   consignment id/tracking number/label URL the courier's own API
 *   returns.
 * - **Manual**: the method is self-managed (`provider_code` null/
 *   'manual'), or the caller explicitly supplies its own tracking number
 *   — Couriers\ManualProvider's own bookShipment() refuses to be called at
 *   all (see that class's docblock), so a manual tracking number is
 *   required whenever no courier booking will happen; this Action never
 *   invents one.
 */
final readonly class DispatchShipmentAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
        private ProviderRegistry $providerRegistry,
    ) {}

    public function execute(
        Shipment $shipment,
        ?string $shippingMethodId,
        ?string $manualTrackingNumber,
        int $expectedVersion,
        ?string $actorId,
    ): Shipment {
        if (! $shipment->hasDestination()) {
            throw new ShipmentValidationException('missing_destination', "Shipment [{$shipment->id}] has no destination address — set it before dispatch.");
        }

        $providerCode = $shipment->courier_provider_code;

        if ($shippingMethodId !== null) {
            $method = ShippingMethod::query()->find($shippingMethodId);

            if ($method === null) {
                throw new ShipmentValidationException('unknown_shipping_method', "Shipping method [{$shippingMethodId}] does not exist.");
            }

            $providerCode = $method->provider_code;
        }

        return DB::transaction(function () use ($shipment, $shippingMethodId, $manualTrackingNumber, $providerCode, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);
            $shipment->assertCanTransitionTo(Shipment::STATUS_DISPATCHED);

            $courierConsignmentId = null;
            $trackingNumber = $manualTrackingNumber;
            $labelUrl = null;

            $provider = $providerCode !== null ? $this->providerRegistry->get($providerCode) : null;

            if ($provider !== null && $provider->isAvailable() && $provider->supportsBooking() && $manualTrackingNumber === null) {
                try {
                    $result = $provider->bookShipment(new ShipmentBookingRequest(
                        invoiceReference: $shipment->order_number,
                        recipientName: (string) $shipment->destination_recipient_name,
                        recipientPhone: (string) $shipment->destination_phone,
                        addressLine1: (string) $shipment->destination_address_line1,
                        addressLine2: $shipment->destination_address_line2,
                        city: (string) $shipment->destination_city,
                        region: (string) $shipment->destination_region,
                        postalCode: $shipment->destination_postal_code,
                        countryCode: (string) $shipment->destination_country_code,
                        itemDescription: $shipment->items()->pluck('description')->filter()->implode(', ') ?: null,
                        weightGrams: (int) $shipment->weight_grams,
                        codAmount: $shipment->grand_total ?? '0.0000',
                    ));
                } catch (CourierBookingFailedException $e) {
                    throw new ShipmentValidationException('courier_booking_failed', $e->getMessage());
                }

                $courierConsignmentId = $result->courierConsignmentId;
                $trackingNumber = $result->trackingNumber;
                $labelUrl = $result->labelUrl;
            } elseif ($trackingNumber === null) {
                throw new ShipmentValidationException(
                    'tracking_number_required',
                    "Shipment [{$shipment->id}]'s courier does not support automated booking (or none is configured) — supply a tracking number manually.",
                );
            }

            $shipment->shipping_method_id = $shippingMethodId ?? $shipment->shipping_method_id;
            $shipment->courier_provider_code = $providerCode;
            $shipment->courier_consignment_id = $courierConsignmentId;
            $shipment->tracking_number = $trackingNumber;
            $shipment->label_url = $labelUrl;
            $shipment->status = Shipment::STATUS_DISPATCHED;
            $shipment->dispatched_at = now();
            $shipment->save();

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => "Dispatched — tracking number {$trackingNumber}.",
                'occurred_at' => $shipment->dispatched_at,
            ]);

            $this->auditLogger->log(
                action: 'shipment.dispatched',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: $shipment->only(['status', 'courier_provider_code', 'courier_consignment_id', 'tracking_number', 'dispatched_at']),
            );

            $this->eventBus->publish(new ShipmentDispatchedEvent(
                shipmentId: $shipment->id,
                orderId: $shipment->order_id,
                courierProviderCode: $shipment->courier_provider_code,
                trackingNumber: $shipment->tracking_number,
            ));

            return $shipment;
        });
    }
}
