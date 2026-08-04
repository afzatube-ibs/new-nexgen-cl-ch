<?php

declare(strict_types=1);

use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Support\Str;

function promotionsEvaluatePayload(array $overrides = []): array
{
    return array_merge([
        'items' => [
            ['product_id' => (string) Str::uuid(), 'quantity' => 1, 'unit_price' => '100.00'],
        ],
        'subtotal' => '100.00',
        'currency_code' => 'USD',
    ], $overrides);
}

it('denies evaluating promotions without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions/evaluate', promotionsEvaluatePayload())
        ->assertStatus(403);
});

it('evaluates an eligible percentage promotion against a cart', function () {
    $caller = userWithPermissions(['promotions.promotions.view']);
    Promotion::factory()->percentage('10.0000')->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/promotions/evaluate', promotionsEvaluatePayload());

    $response->assertOk()
        ->assertJsonPath('data.totalDiscount', '10.0000')
        ->assertJsonCount(1, 'data.appliedPromotions');
});

it('returns no applied promotions and zero discount when nothing is eligible', function () {
    $caller = userWithPermissions(['promotions.promotions.view']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/promotions/evaluate', promotionsEvaluatePayload());

    $response->assertOk()
        ->assertJsonPath('data.totalDiscount', '0.0000')
        ->assertJsonCount(0, 'data.appliedPromotions');
});

it('validates the evaluate request shape', function () {
    $caller = userWithPermissions(['promotions.promotions.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/promotions/evaluate', promotionsEvaluatePayload(['currency_code' => 'ZZZ']))
        ->assertStatus(422);
});
