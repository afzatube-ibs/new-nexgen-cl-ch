<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    Queue::fake();
});

it('denies listing notifications without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/notifications')
        ->assertStatus(403);
});

it('denies queuing a notification without the manage permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/notifications', ['channel' => 'email', 'recipient' => 'a@example.test', 'body' => 'Hi'])
        ->assertStatus(403);
});

it('queues an ad-hoc notification given the manage permission', function () {
    $caller = userWithPermissions(['notifications.notifications.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/notifications', [
        'channel' => 'email',
        'recipient' => 'operator@example.test',
        'subject' => 'Heads up',
        'body' => 'Manual notice.',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.status', 'queued')
        ->assertJsonPath('data.recipient', 'operator@example.test');

    expect(Notification::query()->where('recipient', 'operator@example.test')->exists())->toBeTrue();
});

it('rejects queuing a notification with neither a template nor a body', function () {
    $caller = userWithPermissions(['notifications.notifications.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/notifications', ['channel' => 'email', 'recipient' => 'a@example.test'])
        ->assertStatus(422);
});

it('shows a notification with its delivery attempts loaded', function () {
    $caller = userWithPermissions(['notifications.notifications.view']);
    $notification = Notification::factory()->sent()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/notifications/{$notification->id}");

    $response->assertOk()->assertJsonStructure(['data' => ['id', 'status', 'deliveryAttempts']]);
});

it('filters the notification list by status', function () {
    $caller = userWithPermissions(['notifications.notifications.view']);
    Notification::factory()->sent()->create();
    Notification::factory()->failed()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/notifications?status=failed');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('status')->unique()->all())->toBe(['failed']);
});

it('retries a failed notification given the manage permission', function () {
    $caller = userWithPermissions(['notifications.notifications.manage']);
    $notification = Notification::factory()->failed()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/notifications/{$notification->id}/retry");

    $response->assertOk()->assertJsonPath('data.status', 'queued');
});

it('refuses to retry a notification that is not failed', function () {
    $caller = userWithPermissions(['notifications.notifications.manage']);
    $notification = Notification::factory()->sent()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/notifications/{$notification->id}/retry")
        ->assertStatus(422);
});

it('cancels a pending notification', function () {
    $caller = userWithPermissions(['notifications.notifications.manage']);
    $notification = Notification::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/notifications/{$notification->id}/cancel", ['expected_version' => 1]);

    $response->assertOk()->assertJsonPath('data.status', 'cancelled');
});

it('rejects a stale expected_version on cancel as a 409 conflict', function () {
    $caller = userWithPermissions(['notifications.notifications.manage']);
    $notification = Notification::factory()->create();
    $notification->update(['subject' => 'changed']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/notifications/{$notification->id}/cancel", ['expected_version' => 1])
        ->assertStatus(409);
});
