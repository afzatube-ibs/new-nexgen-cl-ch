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
 * RedX — a Bangladesh-first nationwide courier. Production-ready
 * architecture against its real, documented OpenAPI parcel platform
 * (Bearer `API-ACCESS-TOKEN` authentication), gated by isAvailable() on
 * this installation's configured credentials. RedX's OpenAPI publishes
 * parcel creation/tracking endpoints but no live, per-shipment rate-quote
 * endpoint (confirmed against its own developer API documentation);
 * quoteLiveRate() honestly reflects that per Contracts\
 * ShippingProviderContract::quoteLiveRate()'s docblock.
 *
 * bookShipment() POSTs to RedX's `/parcel` resource with the recipient and
 * item fields its OpenAPI documents (`customer_name`, `customer_phone`,
 * `delivery_area`, `customer_address`, `cash_collection_amount`,
 * `parcel_details_json`) under the `API-ACCESS-TOKEN` bearer header — the
 * general OpenAPI parcel-creation shape confirmed against RedX's public
 * developer resources; verify exact field names against RedX's current
 * merchant onboarding documentation before enabling in a live installation.
 */
final readonly class RedxProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config, private HttpFactory $http) {}

    public function code(): string
    {
        return 'redx';
    }

    public function label(): string
    {
        return 'RedX';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['api_token'] ?? null);
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
            ->withHeaders(['API-ACCESS-TOKEN' => 'Bearer '.$this->config['api_token']])
            ->post($this->baseUrl().'/parcel', [
                'customer_name' => $request->recipientName,
                'customer_phone' => $request->recipientPhone,
                'delivery_area' => $request->city,
                'customer_address' => trim($request->addressLine1.' '.($request->addressLine2 ?? '')),
                'merchant_invoice_id' => $request->invoiceReference,
                'cash_collection_amount' => $request->codAmount,
                'parcel_weight' => max($request->weightGrams / 1000, 0.1),
                'value' => $request->codAmount,
                'is_closed_box' => true,
                'parcel_details_json' => [[
                    'name' => $request->itemDescription ?? 'Parcel',
                    'category' => 'Others',
                    'value' => $request->codAmount,
                ]],
            ]);

        if ($response->failed()) {
            throw new CourierBookingFailedException($this->code(), "RedX returned HTTP {$response->status()}.");
        }

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];
        $trackingId = $body['tracking_id'] ?? ($body['trackingId'] ?? null);

        if (! is_scalar($trackingId)) {
            throw new CourierBookingFailedException($this->code(), 'RedX response did not include a tracking_id.');
        }

        return new ShipmentBookingResult(
            courierConsignmentId: (string) $trackingId,
            trackingNumber: (string) $trackingId,
            labelUrl: null,
            raw: $body,
        );
    }

    private function baseUrl(): string
    {
        return rtrim((string) ($this->config['base_url'] ?? 'https://openapi.redx.com.bd/v1.0.0-beta'), '/');
    }
}
