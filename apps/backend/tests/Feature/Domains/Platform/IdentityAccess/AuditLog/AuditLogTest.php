<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Audit\AuditLog;

it('denies viewing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/audit-logs')
        ->assertStatus(403);
});

it('lists audit log entries, newest first, for a caller with permission', function () {
    $caller = userWithPermissions(['identity_access.audit_log.view']);

    // created_at is deliberately not mass-assignable (AuditLog is
    // immutable/system-set — see its docblock), so ordering is controlled
    // here via time travel rather than passing it to create().
    $this->travelTo(now()->subMinute());
    AuditLog::query()->create(['action' => 'test.older']);
    $this->travelBack();
    AuditLog::query()->create(['action' => 'test.newer']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/audit-logs');

    $response->assertOk();
    expect($response->json('data.0.action'))->toBe('test.newer');
});

it('filters the audit log by target_type', function () {
    $caller = userWithPermissions(['identity_access.audit_log.view']);
    AuditLog::query()->create(['action' => 'test.a', 'target_type' => 'TypeA']);
    AuditLog::query()->create(['action' => 'test.b', 'target_type' => 'TypeB']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/audit-logs?target_type=TypeA');

    expect($response->json('meta.total'))->toBe(1);
});
