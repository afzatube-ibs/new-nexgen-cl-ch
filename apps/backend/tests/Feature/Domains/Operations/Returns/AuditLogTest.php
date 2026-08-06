<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Support\Str;

it('denies listing the returns audit log without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/returns/audit-logs')
        ->assertStatus(403);
});

it('lists audit entries produced by return request mutations', function () {
    $caller = userWithPermissions(['returns.requests.manage', 'returns.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/return-requests', [
        'order_id' => (string) Str::uuid(),
        'customer_id' => (string) Str::uuid(),
        'reason' => ReturnRequest::REASON_DAMAGED,
        'items' => [['sku' => 'SKU-500001', 'quantity' => 1]],
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/returns/audit-logs');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('action')->all())->toContain('return_request.created');
});
