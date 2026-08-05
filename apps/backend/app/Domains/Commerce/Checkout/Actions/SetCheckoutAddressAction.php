<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Customers\Models\CustomerAddress;
use Illuminate\Support\Facades\DB;

/**
 * "Address validation" made concrete: sets `billing_address` or
 * `shipping_address` on a session, resolved either from an entry in the
 * registered customer's own address book (`address_id` — refused for a
 * guest session, which has no address book to reference) or from an
 * inline address supplied directly, exactly mirroring Orders' own
 * Actions\CreateOrderAction::resolveAddress() resolution shape (a
 * deliberate, small, independent copy — see that class's docblock for
 * why this project keeps this kind of trivial field-copying local to
 * each caller rather than sharing it).
 */
final readonly class SetCheckoutAddressAction
{
    public const string TYPE_BILLING = 'billing';

    public const string TYPE_SHIPPING = 'shipping';

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $input
     */
    public function execute(CheckoutSession $session, string $type, array $input, int $expectedVersion, ?string $actorId): CheckoutSession
    {
        return DB::transaction(function () use ($session, $type, $input, $expectedVersion, $actorId) {
            $session->assertVersionMatches($expectedVersion);
            $session->assertMutable();

            $resolved = $this->resolveAddress($session, $input);
            $field = $type === self::TYPE_BILLING ? 'billing_address' : 'shipping_address';
            $before = $session->only([$field]);

            $session->{$field} = $resolved;
            $session->resetReviewIfNeeded();
            $session->touchExpiry();
            $session->save();

            $this->auditLogger->log(
                action: $type === self::TYPE_BILLING ? 'checkout.billing_address_set' : 'checkout.shipping_address_set',
                actorId: $actorId,
                targetType: CheckoutSession::class,
                targetId: $session->id,
                before: $before,
                after: [$field => $resolved],
            );

            return $session;
        });
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function resolveAddress(CheckoutSession $session, array $input): array
    {
        if (array_key_exists('address_id', $input) && $input['address_id'] !== null) {
            /** @var CustomerAddress $address */
            $address = CustomerAddress::query()
                ->where('customer_id', $session->customer_id)
                ->findOrFail((string) $input['address_id']);

            return [
                'recipient_name' => $address->recipient_name,
                'phone' => $address->phone,
                'address_line1' => $address->address_line1,
                'address_line2' => $address->address_line2,
                'city' => $address->city,
                'region' => $address->region,
                'postal_code' => $address->postal_code,
                'country_code' => strtoupper($address->country_code),
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
            'country_code' => strtoupper((string) $input['country_code']),
        ];
    }
}
