<?php

declare(strict_types=1);

use App\Domains\Platform\Cms\Models\CmsMenu;
use App\Domains\Platform\StoreConfiguration\Models\Store;

function cmsMenuPayload(array $overrides = []): array
{
    return array_merge([
        'handle' => 'main-navigation',
        'title' => 'Main navigation',
        'items' => [
            ['id' => 'home', 'label' => 'Home', 'href' => '/'],
            ['id' => 'about', 'label' => 'About', 'href' => '/pages/about'],
        ],
    ], $overrides);
}

it('keeps menu drafts out of the published storefront endpoint', function () {
    $manager = userWithPermissions(['cms.menus.manage']);
    $reader = userWithPermissions(['cms.published.view']);
    $store = Store::factory()->create();

    $created = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus", cmsMenuPayload())
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.isPublished', false);

    $this->actingAs($reader, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/published-menus/main-navigation")
        ->assertNotFound();

    expect(CmsMenu::query()->find($created->json('data.id'))?->published_snapshot)->toBeNull();
});

it('publishes a snapshot and does not leak later menu draft edits', function () {
    $manager = userWithPermissions(['cms.menus.manage', 'cms.menus.publish']);
    $reader = userWithPermissions(['cms.published.view']);
    $store = Store::factory()->create();

    $menuId = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus", cmsMenuPayload())
        ->assertCreated()
        ->json('data.id');

    $published = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus/{$menuId}/publish", ['expected_version' => 1])
        ->assertOk()
        ->assertJsonPath('data.isPublished', true)
        ->assertJsonPath('data.lockVersion', 2);

    $this->actingAs($reader, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/published-menus/main-navigation")
        ->assertOk()
        ->assertJsonPath('data.items.1.label', 'About');

    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/stores/{$store->id}/cms/menus/{$menuId}", [
            'items' => [
                ['id' => 'home', 'label' => 'Home', 'href' => '/'],
                ['id' => 'contact', 'label' => 'Contact', 'href' => '/pages/contact'],
            ],
            'expected_version' => $published->json('data.lockVersion'),
        ])
        ->assertOk()
        ->assertJsonPath('data.lockVersion', 3);

    $this->actingAs($reader, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/published-menus/main-navigation")
        ->assertOk()
        ->assertJsonPath('data.items.1.label', 'About');
});

it('can unpublish a live menu', function () {
    $manager = userWithPermissions(['cms.menus.manage', 'cms.menus.publish']);
    $reader = userWithPermissions(['cms.published.view']);
    $store = Store::factory()->create();

    $menuId = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus", cmsMenuPayload())
        ->json('data.id');

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus/{$menuId}/publish", ['expected_version' => 1])
        ->assertOk();

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus/{$menuId}/unpublish", ['expected_version' => 2])
        ->assertOk()
        ->assertJsonPath('data.status', 'draft');

    $this->actingAs($reader, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/published-menus/main-navigation")
        ->assertNotFound();
});

it('rejects unsafe menu destinations', function () {
    $manager = userWithPermissions(['cms.menus.manage']);
    $store = Store::factory()->create();

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus", cmsMenuPayload([
            'items' => [['id' => 'bad', 'label' => 'Bad', 'href' => 'javascript:alert(1)']],
        ]))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('enforces store boundaries and optimistic locking for menus', function () {
    $manager = userWithPermissions(['cms.menus.view', 'cms.menus.manage']);
    $store = Store::factory()->create();
    $otherStore = Store::factory()->create();

    $menuId = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus", cmsMenuPayload())
        ->json('data.id');

    $this->actingAs($manager, 'sanctum')
        ->getJson("/api/v1/stores/{$otherStore->id}/cms/menus/{$menuId}")
        ->assertNotFound();

    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/stores/{$store->id}/cms/menus/{$menuId}", [
            'title' => 'Updated navigation',
            'expected_version' => 1,
        ])
        ->assertOk();

    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/stores/{$store->id}/cms/menus/{$menuId}", [
            'title' => 'Stale navigation',
            'expected_version' => 1,
        ])
        ->assertStatus(409)
        ->assertJsonPath('error.type', 'conflict');
});

it('rejects duplicate menu handles within one store', function () {
    $manager = userWithPermissions(['cms.menus.manage']);
    $store = Store::factory()->create();

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus", cmsMenuPayload())
        ->assertCreated();

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/menus", cmsMenuPayload(['title' => 'Duplicate']))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});
