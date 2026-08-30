<?php

declare(strict_types=1);

use App\Domains\Commerce\Reviews\Models\Review;
use Illuminate\Support\Str;

it('denies listing reviews without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/reviews')
        ->assertStatus(403);
});

it('filters the review list by product_id and status', function () {
    $caller = userWithPermissions(['reviews.reviews.view']);
    $productId = (string) Str::uuid();

    Review::factory()->approved()->create(['product_id' => $productId]);
    Review::factory()->create(['product_id' => $productId]);
    Review::factory()->approved()->create();

    $response = $this->actingAs($caller, 'sanctum')
        ->getJson("/api/v1/reviews?product_id={$productId}&status=approved");

    $response->assertOk()->assertJsonCount(1, 'data');
});

it('shows a single review', function () {
    $caller = userWithPermissions(['reviews.reviews.view']);
    $review = Review::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->getJson("/api/v1/reviews/{$review->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $review->id);
});

it('returns an honest empty summary for a product with no approved reviews', function () {
    $caller = userWithPermissions(['reviews.reviews.view']);
    $productId = (string) Str::uuid();

    Review::factory()->create(['product_id' => $productId]); // pending — never counted

    $response = $this->actingAs($caller, 'sanctum')
        ->getJson("/api/v1/reviews/summary?product_id={$productId}");

    $response->assertOk()
        ->assertJsonPath('data.averageRating', null)
        ->assertJsonPath('data.totalCount', 0);
});

it('computes a real average rating and distribution over only approved reviews', function () {
    $caller = userWithPermissions(['reviews.reviews.view']);
    $productId = (string) Str::uuid();

    Review::factory()->approved()->create(['product_id' => $productId, 'rating' => 5]);
    Review::factory()->approved()->create(['product_id' => $productId, 'rating' => 5]);
    Review::factory()->approved()->create(['product_id' => $productId, 'rating' => 3]);
    Review::factory()->rejected()->create(['product_id' => $productId, 'rating' => 1]); // excluded

    $response = $this->actingAs($caller, 'sanctum')
        ->getJson("/api/v1/reviews/summary?product_id={$productId}");

    $response->assertOk()
        ->assertJsonPath('data.totalCount', 3)
        ->assertJsonPath('data.averageRating', 4.3);

    $distribution = collect($response->json('data.distribution'))->keyBy('stars');
    expect($distribution[5]['count'])->toBe(2);
    expect($distribution[3]['count'])->toBe(1);
    expect($distribution[1]['count'])->toBe(0);
});

it('never blends reviews from a different product into the summary', function () {
    $caller = userWithPermissions(['reviews.reviews.view']);
    $productId = (string) Str::uuid();

    Review::factory()->approved()->create(['product_id' => $productId, 'rating' => 5]);
    Review::factory()->approved()->create(['rating' => 1]); // a different product

    $response = $this->actingAs($caller, 'sanctum')
        ->getJson("/api/v1/reviews/summary?product_id={$productId}");

    // A whole-number average (5.0) serializes over JSON as the bare integer
    // 5, not "5.0" — a PHP json_encode() quirk, harmless to every real
    // consumer (RatingSummary.tsx's own `averageRating.toFixed(1)` treats
    // a JS number 5 identically to 5.0), so this asserts the real value
    // loosely rather than asserting on JSON's incidental representation.
    $response->assertOk()->assertJsonPath('data.totalCount', 1);
    expect($response->json('data.averageRating'))->toEqual(5.0);
});
