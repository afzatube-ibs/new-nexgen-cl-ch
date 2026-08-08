<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Models\NotificationTemplate;

it('denies listing templates without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/notification-templates')
        ->assertStatus(403);
});

it('creates a template given the manage permission', function () {
    $caller = userWithPermissions(['notifications.templates.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/notification-templates', [
        'code' => 'test.created',
        'channel' => 'email',
        'subject' => 'Hello {{name}}',
        'body' => 'Body {{name}}',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.code', 'test.created')
        ->assertJsonPath('data.channel', 'email')
        ->assertJsonPath('data.isActive', true)
        ->assertJsonPath('data.version', 1);

    expect(NotificationTemplate::query()->where('code', 'test.created')->exists())->toBeTrue();
});

it('rejects creating a template with an invalid channel', function () {
    $caller = userWithPermissions(['notifications.templates.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/notification-templates', [
            'code' => 'test.bad',
            'channel' => 'carrier_pigeon',
            'body' => 'Body',
        ])
        ->assertStatus(422);
});

it('shows a template given the view permission', function () {
    $caller = userWithPermissions(['notifications.templates.view']);
    $template = NotificationTemplate::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->getJson("/api/v1/notification-templates/{$template->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $template->id);
});

it('updates a template when the expected version matches', function () {
    $caller = userWithPermissions(['notifications.templates.manage']);
    $template = NotificationTemplate::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/notification-templates/{$template->id}", [
        'subject' => 'New subject',
        'expected_version' => 1,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.subject', 'New subject')
        ->assertJsonPath('data.version', 2);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['notifications.templates.manage']);
    $template = NotificationTemplate::factory()->create();
    $template->update(['subject' => 'Changed already']);

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/notification-templates/{$template->id}", [
            'subject' => 'Conflicting change',
            'expected_version' => 1,
        ])
        ->assertStatus(409);
});

it('deactivates a template via update', function () {
    $caller = userWithPermissions(['notifications.templates.manage']);
    $template = NotificationTemplate::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/notification-templates/{$template->id}", [
        'is_active' => false,
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.isActive', false);
});

it('filters the template list by channel', function () {
    $caller = userWithPermissions(['notifications.templates.view']);
    NotificationTemplate::factory()->create(['channel' => 'email']);
    NotificationTemplate::factory()->create(['channel' => 'in_app']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/notification-templates?channel=in_app');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('channel')->unique()->all())->toBe(['in_app']);
});

it('searches the template list by free-text code/subject/body match', function () {
    // Template Search, per the accepted scope for MODULE:SEARCH
    // (docs/04_MODULE_ARCHITECTURE.md v1.5) — satisfied by this module's
    // own list endpoint rather than by Search's cross-domain index.
    $caller = userWithPermissions(['notifications.templates.view']);
    NotificationTemplate::factory()->create(['code' => 'order.confirmation', 'subject' => 'Your order is confirmed']);
    NotificationTemplate::factory()->create(['code' => 'payment.receipt', 'subject' => 'Payment received']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/notification-templates?q=confirmation');

    expect($response->json('meta.total'))->toBe(1);
    expect($response->json('data.0.code'))->toBe('order.confirmation');
});
