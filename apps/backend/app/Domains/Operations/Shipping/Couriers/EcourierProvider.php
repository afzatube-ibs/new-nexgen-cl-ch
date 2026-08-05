<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Couriers\Support\ShipmentBookingRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShipmentBookingResult;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;
use App\Domains\Operations\Shipping\Exceptions\CourierBookingFailedException;
use Illuminate\Http\Client\Factory as HttpFactory;

/**
 * eCourier — a Bangladesh-first nationwide courier. Production-ready
 * architecture against its real, documented Merchant API
 * (`API-SECRET`/`API-KEY`/`USER-ID` header authentication, per its own
 * published API documentation at ecourier.com.bd/resources), gated by
 * isAvailable() on this installation's configured credentials. eCourier's
 * Merchant API publishes order placement, tracking, and reference-data
 * endpoints but no live, per-shipment rate-quote endpoint; quoteLiveRate()
 * honestly reflects that per Contracts\ShippingProviderContract::
 * quoteLiveRate()'s docblock.
 *
 * bookShipment() posts to eCourier's documented order-placement endpoint
 * with the recipient/item fields its Merchant API document describes
 * (`recipient_name`, `recipient_phone`, `recipient_address`,
 * `collection_amount`, `product_name`) under its three-header
 * authentication scheme; verify exact field names against eCourier's
 * current Merchant API document version before enabling in a live
 * installation, per this class's own isAvailable() gate.
 */
final readonly class EcourierProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config, private HttpFactory $http) {}

    public function code(): string
    {
        return 'ecourier';
    }

    public function label(): string
    {
        return 'eCourier';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['api_key'] ?? null)
            && filled($this->config['api_secret'] ?? null)
            && filled($this->config['user_id'] ?? null);
    }

    public function supportsLiveRateQuote(): bool
    {
        return false;
    }

    public function quoteLiveRate(ShippingRateQuoteRequest $request): ?ShippingRateQuoteResult
    {
        return null;
    }

    public function supportsBooking(): bool
    {
        return true;
    }

    public function bookShipment(ShipmentBookingRequest $request): ShipmentBookingResult
    {
        $response = $this->http
            ->withHeaders([
                'API-KEY' => $this->config['api_key'],
                'API-SECRET' => $this->config['api_secret'],
                'USER-ID' => $this->config['user_id'],
            ])
            ->post($this->baseUrl().'/order/create', [
                'invoice' => $request->invoiceReference,
                'recipient_name' => $request->recipientName,
                'recipient_phone' => $request->recipientPhone,
                'recipient_address' => trim($request->addressLine1.' '.($request->addressLine2 ?? '')),
                'collection_amount' => $request->codAmount,
                'product_name' => $request->itemDescription ?? 'Parcel',
                'product_weight' => max($request->weightGrams / 1000, 0.1),
            ]);

        if ($response->failed()) {
            throw new CourierBookingFailedException($this->code(), "eCourier returned HTTP {$response->status()}.");
        }

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];
        $trackingNumber = $body['tracking_number'] ?? ($body['consignment_id'] ?? null);

        if (! is_scalar($trackingNumber)) {
            throw new CourierBookingFailedException($this->code(), 'eCourier response did not include a tracking number.');
        }

        return new ShipmentBookingResult(
            courierConsignmentId: (string) $trackingNumber,
            trackingNumber: (string) $trackingNumber,
            labelUrl: null,
            raw: $body,
        );
    }

    private function baseUrl(): string
    {
        return rtrim((string) ($this->config['base_url'] ?? 'https://backend.ecourier.com.bd/api'), '/');
    }
}
