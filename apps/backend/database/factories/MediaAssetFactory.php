<?php

namespace Database\Factories;

use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<MediaAsset>
 */
class MediaAssetFactory extends Factory
{
    protected $model = MediaAsset::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'disk' => 'public',
            'path' => 'media/'.Str::uuid()->toString().'.jpg',
            'filename' => fake()->word().'.jpg',
            'mime_type' => 'image/jpeg',
            'size' => fake()->numberBetween(1024, 2_000_000),
            'width' => 800,
            'height' => 600,
            'alt_text' => fake()->sentence(3),
        ];
    }
}
