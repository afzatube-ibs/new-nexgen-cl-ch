<?php

namespace Database\Factories;

use App\Domains\Operations\Fulfillment\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Shipment>
 */
class ShipmentFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = Shipment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => (string) Str::uuid(),
            'order_number' => 'ORD-'.fake()->unique()->numerify('######'),
            'customer_id' => (string) Str::uuid(),
            'grand_total' => fake()->randomFloat(4, 100, 5000),
            'currency_code' => 'BDT',
            'status' => Shipment::STATUS_PENDING,
        ];
    }

    public function withDestination(): static
    {
        return $this->state(fn (array $attributes) => [
            'destination_recipient_name' => fake()->name(),
            'destination_phone' => '01'.fake()->numerify('#########'),
            'destination_address_line1' => fake()->streetAddress(),
            'destination_city' => 'Dhaka',
            'destination_region' => 'Dhaka',
            'destination_postal_code' => fake()->postcode(),
            'destination_country_code' => 'BD',
            'weight_grams' => fake()->numberBetween(200, 5000),
        ]);
    }

    public function picking(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Shipment::STATUS_PICKING]);
    }

    public function picked(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Shipment::STATUS_PICKED, 'picked_at' => now()]);
    }

    public function packing(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Shipment::STATUS_PACKING]);
    }

    public function packed(): static
    {
        return $this->withDestination()->state(fn (array $attributes) => ['status' => Shipment::STATUS_PACKED, 'packed_at' => now()]);
    }

    public function dispatched(): static
    {
        return $this->packed()->state(fn (array $attributes) => [
            'status' => Shipment::STATUS_DISPATCHED,
            'dispatched_at' => now(),
            'tracking_number' => 'TRK'.fake()->unique()->numerify('########'),
        ]);
    }

    public function delivered(): static
    {
        return $this->dispatched()->state(fn (array $attributes) => ['status' => Shipment::STATUS_DELIVERED, 'delivered_at' => now()]);
    }
}
