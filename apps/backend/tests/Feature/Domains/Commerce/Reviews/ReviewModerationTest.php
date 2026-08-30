<?php

declare(strict_types=1);

use App\Domains\Commerce\Reviews\Models\Review;

it('denies approving without the moderate permission', function () {
    $caller = userWithPermissions([]);
    $review = Review::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/approve", ['expected_version' => 1])
        ->assertStatus(403);
});

it('approves a pending review', function () {
    $caller = userWithPermissions(['reviews.reviews.moderate']);
    $review = Review::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/approve", ['expected_version' => 1]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.version', 2);
});

it('rejects a pending review with a reason', function () {
    $caller = userWithPermissions(['reviews.reviews.moderate']);
    $review = Review::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/reject", [
            'reason' => 'Contains promotional spam.',
            'expected_version' => 1,
        ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejectionReason', 'Contains promotional spam.');
});

it('allows moderation to be bidirectional: a rejected review can later be approved on appeal', function () {
    $caller = userWithPermissions(['reviews.reviews.moderate']);
    $review = Review::factory()->rejected()->create(['lock_version' => 2]);

    $response = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/approve", ['expected_version' => 2]);

    $response->assertOk()->assertJsonPath('data.status', 'approved');
});

it('allows moderation to be bidirectional: an approved review can later be rejected for reported abuse', function () {
    $caller = userWithPermissions(['reviews.reviews.moderate']);
    $review = Review::factory()->approved()->create(['lock_version' => 2]);

    $response = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/reject", [
            'reason' => 'Reported for abuse after going live.',
            'expected_version' => 2,
        ]);

    $response->assertOk()->assertJsonPath('data.status', 'rejected');
});

it('refuses to re-approve an already-approved review (no self-transition)', function () {
    $caller = userWithPermissions(['reviews.reviews.moderate']);
    $review = Review::factory()->approved()->create(['lock_version' => 2]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/approve", ['expected_version' => 2])
        ->assertStatus(422);
});

it('rejects a stale expected_version on a moderation action as a 409 conflict', function () {
    $caller = userWithPermissions(['reviews.reviews.moderate']);
    $review = Review::factory()->create();
    $review->update(['title' => 'changed']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/approve", ['expected_version' => 1])
        ->assertStatus(409);
});

it('denies responding without the manage permission', function () {
    $caller = userWithPermissions(['reviews.reviews.moderate']);
    $review = Review::factory()->approved()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/respond", [
            'body' => 'Thanks for the feedback!',
            'expected_version' => 1,
        ])
        ->assertStatus(403);
});

it('sets a merchant response on a review, replacing any prior one', function () {
    $caller = userWithPermissions(['reviews.reviews.manage']);
    $review = Review::factory()->approved()->create();

    $first = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/respond", [
            'body' => 'Thanks for the feedback!',
            'expected_version' => 1,
        ]);
    $first->assertOk()->assertJsonPath('data.merchantResponse.body', 'Thanks for the feedback!');

    $second = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reviews/{$review->id}/respond", [
            'body' => 'Update: issue resolved.',
            'expected_version' => 2,
        ]);
    $second->assertOk()->assertJsonPath('data.merchantResponse.body', 'Update: issue resolved.');
});

it('denies deleting a review without the manage permission', function () {
    $caller = userWithPermissions(['reviews.reviews.moderate']);
    $review = Review::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/reviews/{$review->id}", ['expected_version' => 1])
        ->assertStatus(403);
});

it('soft-deletes a review given the manage permission', function () {
    $caller = userWithPermissions(['reviews.reviews.manage']);
    $review = Review::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/reviews/{$review->id}", ['expected_version' => 1])
        ->assertStatus(204);

    expect(Review::query()->find($review->id))->toBeNull();
    expect(Review::withTrashed()->find($review->id))->not->toBeNull();
});
