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
 * Steadfast Courier Limited — a Bangladesh-first nationwide courier.
 * Production-ready architecture against its real, documented API shape
 * (portal.packzy.com/api/v1, API-Key/Secret-Key header authentication),
 * gated by isAvailable() on this installation's configured credentials —
 * mirrors Payments' SslcommerzGateway treatment exactly. Steadfast
 * publishes no live, per-shipment rate-quote API (confirmed against its
 * own API documentation); quoteLiveRate() honestly reflects that per
 * Contracts\ShippingProviderContract::quoteLiveRate()'s docblock.
 *
 * bookShipment() calls Steadfast's documented `create_order` endpoint
 * (`invoice`, `recipient_name`, `recipient_phone`, `recipient_address`,
 * `cod_amount`, optional `note`), returning
 * `response.consignment.consignment_id`/`tracking_code` on success —
 * field names confirmed against Steadfast's own published API
 * documentation and third-party integration guides at the time this class
 * was written; verify against Steadfast's current merchant documentation
 * before enabling in a live installation, per this class's own isAvailable()
 * gate.
 */
final readonly class SteadfastProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config, private HttpFactory $http) {}

    public function code(): string
    {
        return 'steadfast';
    }

    public function label(): string
    {
        return 'Steadfast Courier Limited';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['api_key'] ?? null) && filled($this->config['secret_key'] ?? null);
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
                'Api-Key' => $this->config['api_key'],
                'Secret-Key' => $this->config['secret_key'],
            ])
            ->post($this->baseUrl().'/create_order', [
                'invoice' => $request->invoiceReference,
                'recipient_name' => $request->recipientName,
                'recipient_phone' => $request->recipientPhone,
                'recipient_address' => trim($request->addressLine1.' '.($request->addressLine2 ?? '')),
                'cod_amount' => $request->codAmount,
                'note' => $request->itemDescription,
            ]);

        if ($response->failed()) {
            throw new CourierBookingFailedException($this->code(), "Steadfast returned HTTP {$response->status()}.");
        }

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];
        /** @var array<string, mixed> $consignment */
        $consignment = is_array($body['consignment'] ?? null) ? $body['consignment'] : [];

        $consignmentId = $consignment['consignment_id'] ?? null;
        $trackingCode = $consignment['tracking_code'] ?? null;

        if (! is_scalar($consignmentId) || ! is_scalar($trackingCode)) {
            throw new CourierBookingFailedException($this->code(), 'Steadfast response did not include a consignment_id/tracking_code.');
        }

        return new ShipmentBookingResult(
            courierConsignmentId: (string) $consignmentId,
            trackingNumber: (string) $trackingCode,
            labelUrl: null,
            raw: $body,
        );
    }

    private function baseUrl(): string
    {
        return rtrim((string) ($this->config['base_url'] ?? 'https://portal.packzy.com/api/v1'), '/');
    }
}
