<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Models\ReturnRequest;

it('denies adding a note without the manage permission', function () {
    $caller = userWithPermissions([]);
    $returnRequest = ReturnRequest::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/return-requests/{$returnRequest->id}/notes", ['body' => 'Handle with care'])
        ->assertStatus(403);
});

it('adds a note to a return request and records a timeline entry', function () {
    $caller = userWithPermissions(['returns.requests.manage']);
    $returnRequest = ReturnRequest::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/return-requests/{$returnRequest->id}/notes", [
        'body' => 'Customer confirmed the item is unopened.',
        'is_customer_visible' => true,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.body', 'Customer confirmed the item is unopened.')
        ->assertJsonPath('data.isCustomerVisible', true);

    expect($returnRequest->timelineEvents()->where('event_type', 'note_added')->count())->toBe(1);
});

it('rejects a note with an empty body', function () {
    $caller = userWithPermissions(['returns.requests.manage']);
    $returnRequest = ReturnRequest::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/return-requests/{$returnRequest->id}/notes", ['body' => ''])
        ->assertStatus(422);
});
