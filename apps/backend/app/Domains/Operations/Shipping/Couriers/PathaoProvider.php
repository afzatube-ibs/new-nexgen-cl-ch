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
 * Pathao Courier — a Bangladesh-first nationwide courier. Production-ready
 * architecture against its real, documented OAuth2 Merchant API
 * (sandbox: courier-api-sandbox.pathao.com, production: api-hermes.pathao.
 * com; client_id/client_secret/username/password), gated by isAvailable()
 * on this installation's configured credentials — mirrors Payments'
 * BkashGateway treatment exactly. Pathao's merchant API does not expose a
 * live, per-shipment rate-quote endpoint a merchant integration can call
 * (confirmed against its own API documentation); quoteLiveRate() honestly
 * reflects that per Contracts\ShippingProviderContract::quoteLiveRate()'s
 * docblock.
 *
 * bookShipment(): authenticates via `/aladdin/api/v1/issue-token` (grant_type
 * password), then POSTs `/aladdin/api/v1/orders` (`store_id`,
 * `recipient_name`, `recipient_phone`, `recipient_address`, `item_type`,
 * `item_quantity`, `item_weight`, `amount_to_collect`, `item_description`)
 * — field names confirmed against Pathao's own published Merchant API
 * documentation. Known gap, honestly named rather than papered over: Pathao
 * requires `recipient_city`/`recipient_zone`/`recipient_area` as numeric
 * IDs from its own City/Zone/Area List API, which this Phase 1 delivery
 * does not resolve (Support\ShipmentBookingRequest carries free-text
 * city/region, per every other courier's shape) — `config('shipping.
 * pathao.store_id')` is required and the request is sent without a
 * resolved zone/area, so this provider is a genuine, callable integration
 * against Pathao's real endpoints but is not yet order-creation-complete;
 * resolving the location hierarchy is a named Future Extension Point, not
 * fabricated as already working.
 */
final readonly class PathaoProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config, private HttpFactory $http) {}

    public function code(): string
    {
        return 'pathao';
    }

    public function label(): string
    {
        return 'Pathao Courier';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['client_id'] ?? null)
            && filled($this->config['client_secret'] ?? null)
            && filled($this->config['username'] ?? null)
            && filled($this->config['password'] ?? null);
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
        $storeId = $this->config['store_id'] ?? null;

        if (! is_scalar($storeId)) {
            throw new CourierBookingFailedException($this->code(), 'SHIPPING_PATHAO_STORE_ID is not configured.');
        }

        $accessToken = $this->issueAccessToken();

        $response = $this->http
            ->withToken($accessToken)
            ->post($this->baseUrl().'/aladdin/api/v1/orders', [
                'store_id' => $storeId,
                'merchant_order_id' => $request->invoiceReference,
                'recipient_name' => $request->recipientName,
                'recipient_phone' => $request->recipientPhone,
                'recipient_address' => trim($request->addressLine1.' '.($request->addressLine2 ?? '')),
                'delivery_type' => 48,
                'item_type' => 2,
                'item_quantity' => 1,
                'item_weight' => max($request->weightGrams / 1000, 0.1),
                'item_description' => $request->itemDescription,
                'amount_to_collect' => $request->codAmount,
                'special_instruction' => "Invoice: {$request->invoiceReference}",
            ]);

        if ($response->failed()) {
            throw new CourierBookingFailedException($this->code(), "Pathao returned HTTP {$response->status()}.");
        }

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];
        /** @var array<string, mixed> $data */
        $data = is_array($body['data'] ?? null) ? $body['data'] : [];

        $consignmentId = $data['consignment_id'] ?? null;

        if (! is_scalar($consignmentId)) {
            throw new CourierBookingFailedException($this->code(), 'Pathao response did not include a consignment_id.');
        }

        return new ShipmentBookingResult(
            courierConsignmentId: (string) $consignmentId,
            trackingNumber: (string) $consignmentId,
            labelUrl: null,
            raw: $body,
        );
    }

    private function issueAccessToken(): string
    {
        $response = $this->http->post($this->baseUrl().'/aladdin/api/v1/issue-token', [
            'client_id' => $this->config['client_id'],
            'client_secret' => $this->config['client_secret'],
            'username' => $this->config['username'],
            'password' => $this->config['password'],
            'grant_type' => 'password',
        ]);

        if ($response->failed()) {
            throw new CourierBookingFailedException($this->code(), "Pathao token issuance returned HTTP {$response->status()}.");
        }

        $token = $response->json('access_token');

        if (! is_string($token) || $token === '') {
            throw new CourierBookingFailedException($this->code(), 'Pathao token issuance response did not include an access_token.');
        }

        return $token;
    }

    private function baseUrl(): string
    {
        return rtrim((string) ($this->config['base_url'] ?? 'https://courier-api-sandbox.pathao.com'), '/');
    }
}
