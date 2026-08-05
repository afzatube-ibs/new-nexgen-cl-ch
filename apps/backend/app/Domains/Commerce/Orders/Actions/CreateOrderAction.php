<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Actions;

use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Orders\Audit\AuditLogger;
use App\Domains\Commerce\Orders\Events\OrderPlaced;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderAddress;
use App\Domains\Commerce\Orders\Models\OrderTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Places an Order — the one place this module reads Customers' live data,
 * exactly once, to freeze it into this aggregate's own snapshot columns
 * (see the orders migration's docblock). Every price, discount, and tax
 * figure arrives already resolved in `$attributes` — this action only
 * sums them into the order's own totals via bcmath; it never calls
 * Pricing or Promotions to calculate anything itself, per this module's
 * "records the outcome ... never recalculates independently" Security
 * Consideration.
 */
final readonly class CreateOrderAction
{
    private const int SCALE = 4;

    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Order
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            /** @var Customer $customer */
            $customer = Customer::query()->findOrFail($attributes['customer_id']);

            /** @var list<array<string, mixed>> $items */
            $items = $attributes['items'];
            /** @var list<array<string, mixed>> $discounts */
            $discounts = $attributes['discounts'] ?? [];

            $subtotal = '0.0000';
            $taxTotal = '0.0000';

            foreach ($items as $item) {
                $lineSubtotal = bcmul($this->numeric((string) $item['unit_price']), $this->numeric((string) $item['quantity']), self::SCALE);
                $subtotal = bcadd($subtotal, $lineSubtotal, self::SCALE);
                $taxTotal = bcadd($taxTotal, $this->numeric((string) ($item['tax_amount'] ?? '0')), self::SCALE);
            }

            $discountTotal = '0.0000';

            foreach ($discounts as $discount) {
                $discountTotal = bcadd($discountTotal, $this->numeric((string) $discount['amount']), self::SCALE);
            }

            $shippingTotal = bcadd($this->numeric((string) ($attributes['shipping_total'] ?? '0')), '0', self::SCALE);
            $grandTotal = bcadd(
                bcsub(bcadd($subtotal, $taxTotal, self::SCALE), $discountTotal, self::SCALE),
                $shippingTotal,
                self::SCALE,
            );

            $order = Order::query()->create([
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'customer_email' => $customer->email,
                'customer_phone' => $customer->phone,
                'currency_code' => $attributes['currency_code'],
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'tax_total' => $taxTotal,
                'shipping_total' => $shippingTotal,
                'grand_total' => $grandTotal,
            ]);

            foreach ($items as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'sku' => strtoupper((string) $item['sku']),
                    'product_name' => $item['product_name'],
                    'quantity' => $item['quantity'],
                    'unit_price' => bcadd($this->numeric((string) $item['unit_price']), '0', self::SCALE),
                    'discount_amount' => bcadd($this->numeric((string) ($item['discount_amount'] ?? '0')), '0', self::SCALE),
                    'tax_amount' => bcadd($this->numeric((string) ($item['tax_amount'] ?? '0')), '0', self::SCALE),
                    'line_subtotal' => bcmul($this->numeric((string) $item['unit_price']), $this->numeric((string) $item['quantity']), self::SCALE),
                ]);
            }

            $order->addresses()->create([
                ...$this->resolveAddress($customer, $attributes['billing_address']),
                'address_type' => OrderAddress::TYPE_BILLING,
            ]);

            $order->addresses()->create([
                ...$this->resolveAddress($customer, $attributes['shipping_address']),
                'address_type' => OrderAddress::TYPE_SHIPPING,
            ]);

            foreach ($discounts as $discount) {
                $order->discounts()->create([
                    'promotion_id' => $discount['promotion_id'] ?? null,
                    'code' => $discount['code'] ?? null,
                    'label' => $discount['label'],
                    'amount' => bcadd($this->numeric((string) $discount['amount']), '0', self::SCALE),
                ]);
            }

            $order->timelineEvents()->create([
                'event_type' => OrderTimelineEvent::TYPE_ORDER_PLACED,
                'description' => "Order {$order->order_number} placed.",
                'occurred_at' => $order->placed_at,
            ]);

            $this->auditLogger->log(
                action: 'order.placed',
                actorId: $actorId,
                targetType: Order::class,
                targetId: $order->id,
                after: $order->only(['order_number', 'customer_id', 'currency_code', 'grand_total', 'status']),
            );

            $this->eventBus->publish(new OrderPlaced(
                orderId: $order->id,
                orderNumber: $order->order_number,
                customerId: $order->customer_id,
                grandTotal: $order->grand_total,
                currencyCode: $order->currency_code,
            ));

            return $order->load(['items', 'addresses', 'discounts', 'timelineEvents']);
        });
    }

    /**
     * Resolves a billing/shipping address either from an existing entry
     * in the customer's own address book (`address_id`) or from an inline
     * address the caller supplies directly — either way, only the field
     * VALUES are copied into the order's own snapshot, never a live
     * reference, per this module's "immutable snapshots" requirement.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function resolveAddress(Customer $customer, array $input): array
    {
        if (array_key_exists('address_id', $input) && $input['address_id'] !== null) {
            $address = $customer->addresses()->findOrFail((string) $input['address_id']);

            return [
                'recipient_name' => $address->recipient_name,
                'phone' => $address->phone,
                'address_line1' => $address->address_line1,
                'address_line2' => $address->address_line2,
                'city' => $address->city,
                'region' => $address->region,
                'postal_code' => $address->postal_code,
                'country_code' => $address->country_code,
            ];
        }

        return [
            'recipient_name' => $input['recipient_name'],
            'phone' => $input['phone'] ?? null,
            'address_line1' => $input['address_line1'],
            'address_line2' => $input['address_line2'] ?? null,
            'city' => $input['city'],
            'region' => $input['region'] ?? null,
            'postal_code' => $input['postal_code'] ?? null,
            'country_code' => $input['country_code'],
        ];
    }

    /**
     * @return numeric-string
     */
    private function numeric(string $value): string
    {
        if (! is_numeric($value)) {
            throw new InvalidArgumentException("Expected a numeric string, got [{$value}].");
        }

        return $value;
    }
}
