<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Queue;

it('denies listing the notifications audit log without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/notification-audit-logs')
        ->assertStatus(403);
});

it('lists audit entries produced by notification template mutations', function () {
    Queue::fake();
    $caller = userWithPermissions(['notifications.templates.manage', 'notifications.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/notification-templates', [
        'code' => 'audit.test',
        'channel' => 'email',
        'body' => 'Body',
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/notification-audit-logs');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('action')->all())->toContain('notification_template.created');
});
