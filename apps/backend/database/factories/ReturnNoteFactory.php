<?php

namespace Database\Factories;

use App\Domains\Operations\Returns\Models\ReturnNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReturnNote>
 */
class ReturnNoteFactory extends Factory
{
    protected $model = ReturnNote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'return_request_id' => ReturnRequestFactory::new(),
            'author_id' => null,
            'body' => fake()->sentence(),
            'is_customer_visible' => false,
        ];
    }
}
