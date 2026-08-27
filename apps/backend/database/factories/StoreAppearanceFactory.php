<?php

namespace Database\Factories;

use App\Domains\Platform\Appearance\Models\StoreAppearance;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StoreAppearance>
 */
class StoreAppearanceFactory extends Factory
{
    protected $model = StoreAppearance::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'primary_color' => '#4F46E5',
            'secondary_color' => '#0EA5E9',
            'accent_color' => '#F59E0B',
            'border_radius' => StoreAppearance::RADIUS_MD,
            'typography_preset' => 'inter-default',
            'button_style' => StoreAppearance::BUTTON_STYLE_SOLID,
            'announcement_enabled' => false,
        ];
    }
}
