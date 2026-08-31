<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Models\Customer;

it('denies viewing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/customers/audit-logs')
        ->assertStatus(403);
});

it('lists audited customer changes for a caller with the view permission', function () {
    $caller = userWithPermissions(['customers.customers.manage', 'customers.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/customers', [
        'name' => 'Audited Customer',
        'email' => 'audited@nexgen-demo.test',
        'phone' => '+8801700009999',
        'password' => 'Str0ng!Passw0rd#One',
        'password_confirmation' => 'Str0ng!Passw0rd#One',
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/customers/audit-logs');

    $response->assertOk();
    expect($response->json('data.*.action'))->toContain('customer.registered');
});

it('filters the audit log by target_type', function () {
    $caller = userWithPermissions(['customers.customers.manage', 'customers.audit_log.view']);
    $customer = Customer::factory()->create();

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/customers/{$customer->id}/archive", [
        'expected_version' => 1,
    ])->assertOk();

    $response = $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/customers/audit-logs?target_type='.urlencode(Customer::class));

    expect($response->json('meta.total'))->toBeGreaterThanOrEqual(1);
});
