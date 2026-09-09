<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use App\Domains\Operations\Shipping\Models\ShippingZone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Explicit launch-journey fixture for disposable CI/local verification.
 *
 * This seeder deliberately layers checkout-ready shipping configuration on
 * top of DemoStoreSeeder and is never called by DatabaseSeeder. Production
 * bootstrap therefore remains free of merchant data and business defaults.
 */
final class DemoLaunchSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(DemoStoreSeeder::class);

        DB::transaction(function (): void {
            $zone = ShippingZone::query()->updateOrCreate(
                [
                    'name' => 'Bangladesh Demo Delivery',
                    'country_code' => 'BD',
                    'region' => '',
                ],
                ['status' => ShippingZone::STATUS_ACTIVE],
            );

            $method = ShippingMethod::query()->updateOrCreate(
                ['code' => 'demo_standard'],
                [
                    'name' => 'Standard Delivery',
                    'description' => 'Self-fulfilled demo delivery for the neXgen launch journey.',
                    'provider_code' => null,
                    'status' => ShippingMethod::STATUS_ACTIVE,
                ],
            );

            ShippingRate::query()->updateOrCreate(
                [
                    'shipping_zone_id' => $zone->id,
                    'shipping_method_id' => $method->id,
                    'min_weight_grams' => 0,
                    'max_weight_grams' => null,
                ],
                [
                    'amount' => '120.0000',
                    'currency_code' => 'BDT',
                    'status' => ShippingRate::STATUS_ACTIVE,
                ],
            );
        });
    }
}
