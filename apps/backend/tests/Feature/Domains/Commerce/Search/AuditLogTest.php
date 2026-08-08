<?php

declare(strict_types=1);

use App\Domains\Commerce\Search\Audit\AuditLogger;

it('denies listing the audit log without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/search-audit-logs')
        ->assertStatus(403);
});

it('lists audit log entries given the view permission', function () {
    $caller = userWithPermissions(['search.audit_log.view']);
    app(AuditLogger::class)->log(action: 'search.index.rebuilt', actorId: $caller->id, after: ['indexed_count' => 5]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/search-audit-logs');

    $response->assertOk()->assertJsonPath('data.0.action', 'search.index.rebuilt');
});
