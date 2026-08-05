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
 * Paperfly — a Bangladesh-first nationwide courier. Unlike Steadfast,
 * Pathao, and RedX, Paperfly issues per-seller API credentials and a
 * per-seller base URL directly through its account team rather than
 * publishing one shared public base URL (confirmed against its own
 * merchant onboarding process) — this provider is therefore available only
 * once an operator has supplied both `merchant_id`/`api_key` AND the
 * seller-specific `base_url` Paperfly issued them. Paperfly publishes no
 * live, per-shipment rate-quote endpoint; quoteLiveRate() honestly
 * reflects that per Contracts\ShippingProviderContract::quoteLiveRate()'s
 * docblock.
 *
 * bookShipment() posts a merchant-order payload (`merchant_id`, recipient
 * name/phone/address, `cod_amount`, `merchant_order_ref`) to the
 * seller-specific `base_url` Paperfly issued, API-key authenticated — the
 * general shape every per-seller Paperfly integration follows; exact field
 * names are confirmed with the Paperfly account team as part of that
 * seller's own onboarding, per that class's own docblock, so verify
 * against the credentials actually issued before enabling in production.
 */
final readonly class PaperflyProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config, private HttpFactory $http) {}

    public function code(): string
    {
        return 'paperfly';
    }

    public function label(): string
    {
        return 'Paperfly';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['merchant_id'] ?? null)
            && filled($this->config['api_key'] ?? null)
            && filled($this->config['base_url'] ?? null);
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
            ->withHeaders(['Api-Key' => $this->config['api_key']])
            ->post(rtrim((string) $this->config['base_url'], '/').'/order/create', [
                'merchant_id' => $this->config['merchant_id'],
                'merchant_order_ref' => $request->invoiceReference,
                'recipient_name' => $request->recipientName,
                'recipient_phone' => $request->recipientPhone,
                'recipient_address' => trim($request->addressLine1.' '.($request->addressLine2 ?? '')),
                'recipient_area' => $request->city,
                'cod_amount' => $request->codAmount,
                'product_description' => $request->itemDescription,
                'weight' => max($request->weightGrams / 1000, 0.1),
            ]);

        if ($response->failed()) {
            throw new CourierBookingFailedException($this->code(), "Paperfly returned HTTP {$response->status()}.");
        }

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];
        $trackingNumber = $body['tracking_number'] ?? ($body['awb'] ?? null);

        if (! is_scalar($trackingNumber)) {
            throw new CourierBookingFailedException($this->code(), 'Paperfly response did not include a tracking number.');
        }

        return new ShipmentBookingResult(
            courierConsignmentId: (string) $trackingNumber,
            trackingNumber: (string) $trackingNumber,
            labelUrl: null,
            raw: $body,
        );
    }
}
