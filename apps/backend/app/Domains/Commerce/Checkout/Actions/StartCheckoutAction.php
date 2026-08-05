<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Events\CheckoutStarted;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Customers\Models\CustomerAddress;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Opens a new CheckoutSession — "Guest checkout" and "Registered customer
 * checkout" are the same action, distinguished by whether `customer_id`
 * is present in `$attributes` (see Http\Requests\StartCheckoutRequest for
 * the mutual-exclusivity validation between that and `guest_email`/
 * `guest_name`).
 *
 * For a registered customer, this is the one place besides Orders'
 * CreateOrderAction that this platform reads Customers' address book on
 * a customer's behalf: it pre-populates billing/shipping from whichever
 * addresses are flagged `is_default_billing`/`is_default_shipping`, a
 * real convenience "Registered customer checkout" should provide over
 * guest checkout, not a required step — Actions\SetCheckoutAddressAction
 * can still override either at any time before review.
 */
final readonly class StartCheckoutAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): CheckoutSession
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $customerId = $attributes['customer_id'] ?? null;
            $billingAddress = null;
            $shippingAddress = null;

            if ($customerId !== null) {
                /** @var Customer $customer */
                $customer = Customer::query()->findOrFail($customerId);
                $billingAddress = $this->defaultAddressSnapshot($customer, 'is_default_billing');
                $shippingAddress = $this->defaultAddressSnapshot($customer, 'is_default_shipping');
            }

            $session = CheckoutSession::query()->create([
                'customer_id' => $customerId,
                'guest_email' => $customerId === null ? $attributes['guest_email'] : null,
                'guest_name' => $customerId === null ? $attributes['guest_name'] : null,
                'currency_code' => $attributes['currency_code'],
                'billing_address' => $billingAddress,
                'shipping_address' => $shippingAddress,
            ]);

            $this->auditLogger->log(
                action: 'checkout.started',
                actorId: $actorId,
                targetType: CheckoutSession::class,
                targetId: $session->id,
                after: $session->only(['customer_id', 'guest_email', 'currency_code', 'status']),
            );

            $this->eventBus->publish(new CheckoutStarted(
                sessionId: $session->id,
                customerId: $session->customer_id,
                currencyCode: $session->currency_code,
            ));

            return $session;
        });
    }

    /**
     * @return array<string, mixed>|null
     */
    private function defaultAddressSnapshot(Customer $customer, string $defaultFlagColumn): ?array
    {
        /** @var CustomerAddress|null $address */
        $address = $customer->addresses()->where($defaultFlagColumn, true)->first();

        if ($address === null) {
            return null;
        }

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
}
