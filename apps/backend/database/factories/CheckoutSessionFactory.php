<?php

namespace Database\Factories;

use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CheckoutSession>
 */
class CheckoutSessionFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = CheckoutSession::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => null,
            'guest_email' => fake()->unique()->safeEmail(),
            'guest_name' => fake()->name(),
            'currency_code' => 'USD',
            'status' => CheckoutSession::STATUS_OPEN,
        ];
    }

    public function forCustomer(string $customerId): static
    {
        return $this->state(fn (array $attributes) => [
            'customer_id' => $customerId,
            'guest_email' => null,
            'guest_name' => null,
        ]);
    }

    public function reviewed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CheckoutSession::STATUS_REVIEWED,
            'subtotal' => '100.0000',
            'discount_total' => '0.0000',
            'tax_total' => '0.0000',
            'shipping_total' => '0.0000',
            'grand_total' => '100.0000',
            'billing_address' => [
                'recipient_name' => 'Jane Buyer',
                'phone' => null,
                'address_line1' => '1 Main St',
                'address_line2' => null,
                'city' => 'Springfield',
                'region' => null,
                'postal_code' => null,
                'country_code' => 'US',
            ],
            'shipping_address' => [
                'recipient_name' => 'Jane Buyer',
                'phone' => null,
                'address_line1' => '1 Main St',
                'address_line2' => null,
                'city' => 'Springfield',
                'region' => null,
                'postal_code' => null,
                'country_code' => 'US',
            ],
            'shipping_option_id' => 'standard',
        ]);
    }

    public function submitted(): static
    {
        return $this->reviewed()->state(fn (array $attributes) => [
            'status' => CheckoutSession::STATUS_SUBMITTED,
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CheckoutSession::STATUS_EXPIRED,
            'expires_at' => now()->subMinutes(5),
        ]);
    }
}
