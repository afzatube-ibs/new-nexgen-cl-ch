<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Attribute;
use App\Domains\Commerce\Catalog\Models\AttributeGroup;
use App\Domains\Commerce\Catalog\Models\Product;

it('creates an attribute group', function () {
    $caller = userWithPermissions(['catalog.attributes.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/attribute-groups', [
        'code' => 'technical_specs',
        'name' => 'Technical Specifications',
    ]);

    $response->assertCreated()->assertJsonPath('data.code', 'technical_specs');
});

it('creates an attribute within a group', function () {
    $caller = userWithPermissions(['catalog.attributes.manage']);
    $group = AttributeGroup::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/attributes', [
        'attribute_group_id' => $group->id,
        'code' => 'material',
        'name' => 'Material',
        'type' => 'text',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.code', 'material')
        ->assertJsonPath('data.attributeGroupId', $group->id);
});

it('rejects an invalid attribute type', function () {
    $caller = userWithPermissions(['catalog.attributes.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/attributes', ['code' => 'weird', 'name' => 'Weird', 'type' => 'not-a-type'])
        ->assertStatus(422);
});

it('refuses to delete an attribute that a product still has a value for', function () {
    $caller = userWithPermissions(['catalog.attributes.manage']);
    $attribute = Attribute::factory()->create();
    $product = Product::factory()->create();
    $product->attributeValues()->create(['attribute_id' => $attribute->id, 'value' => 'Cotton']);

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/attributes/{$attribute->id}", ['expected_version' => 1])
        ->assertStatus(409)
        ->assertJsonPath('error.type', 'conflict');
});

it('deletes an unused attribute', function () {
    $caller = userWithPermissions(['catalog.attributes.manage']);
    $attribute = Attribute::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/attributes/{$attribute->id}", ['expected_version' => 1])
        ->assertStatus(204);
});

it('restores a deleted attribute', function () {
    $caller = userWithPermissions(['catalog.attributes.manage']);
    $attribute = Attribute::factory()->create();
    $attribute->delete();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/attributes/{$attribute->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.id', $attribute->id);

    expect(Attribute::query()->find($attribute->id))->not->toBeNull();
});

it('restores a deleted attribute group', function () {
    $caller = userWithPermissions(['catalog.attributes.manage']);
    $group = AttributeGroup::factory()->create();
    $group->delete();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/attribute-groups/{$group->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.id', $group->id);

    expect(AttributeGroup::query()->find($group->id))->not->toBeNull();
});

it('deleting an attribute group ungroups its attributes rather than deleting them', function () {
    $caller = userWithPermissions(['catalog.attributes.manage']);
    $group = AttributeGroup::factory()->create();
    $attribute = Attribute::factory()->create(['attribute_group_id' => $group->id]);

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/attribute-groups/{$group->id}", ['expected_version' => 1])
        ->assertStatus(204);

    expect($attribute->fresh()->attribute_group_id)->toBeNull();
});
