<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Models\Customer;
use Illuminate\Support\Str;

it('denies listing the reviews audit log without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/reviews/audit-logs')
        ->assertStatus(403);
});

it('lists audit entries produced by review mutations', function () {
    $customer = Customer::factory()->create();
    $token = $customer->createToken('test-suite')->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/reviews', [
            'product_id' => (string) Str::uuid(),
            'rating' => 4,
            'body' => 'A genuinely useful, well-made product.',
        ])->assertCreated();

    $caller = userWithPermissions(['reviews.audit_log.view']);
    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/reviews/audit-logs');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('action')->all())->toContain('review.submitted');
});
