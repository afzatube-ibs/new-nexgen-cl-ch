<?php

declare(strict_types=1);

use App\Domains\Platform\Cms\Models\CmsPage;
use App\Domains\Platform\StoreConfiguration\Models\Store;

function cmsPagePayload(array $overrides = []): array
{
    return array_merge([
        'slug' => 'privacy-policy',
        'title' => 'Privacy Policy',
        'locale' => 'en-US',
        'content' => [[
            'type' => 'RichText',
            'key' => 'main-content',
            'configuration' => [
                'heading' => 'Privacy Policy',
                'body' => 'Draft privacy content.',
            ],
        ]],
        'meta_title' => 'Privacy Policy',
        'meta_description' => 'How this store handles customer information.',
    ], $overrides);
}

it('keeps a newly-created draft out of the published storefront endpoint', function () {
    $manager = userWithPermissions(['cms.pages.manage']);
    $reader = userWithPermissions(['cms.published.view']);
    $store = Store::factory()->create(['locale' => 'en-US']);

    $created = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages", cmsPagePayload())
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.isPublished', false);

    $this->actingAs($reader, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/published/privacy-policy?locale=en-US")
        ->assertNotFound();

    expect(CmsPage::query()->find($created->json('data.id'))?->published_snapshot)->toBeNull();
});

it('publishes a snapshot and never leaks later draft edits to customers', function () {
    $manager = userWithPermissions(['cms.pages.manage', 'cms.pages.publish']);
    $reader = userWithPermissions(['cms.published.view']);
    $store = Store::factory()->create(['locale' => 'en-US']);

    $pageId = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages", cmsPagePayload())
        ->assertCreated()
        ->json('data.id');

    $published = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}/publish", ['expected_version' => 1])
        ->assertOk()
        ->assertJsonPath('data.isPublished', true)
        ->assertJsonPath('data.lockVersion', 2);

    $this->actingAs($reader, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/published/privacy-policy?locale=en-US")
        ->assertOk()
        ->assertJsonPath('data.content.0.configuration.body', 'Draft privacy content.');

    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}", [
            'content' => [[
                'type' => 'RichText',
                'key' => 'main-content',
                'configuration' => ['heading' => 'Privacy Policy', 'body' => 'Unpublished replacement.'],
            ]],
            'expected_version' => $published->json('data.lockVersion'),
        ])
        ->assertOk()
        ->assertJsonPath('data.lockVersion', 3);

    $this->actingAs($reader, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/published/privacy-policy?locale=en-US")
        ->assertOk()
        ->assertJsonPath('data.content.0.configuration.body', 'Draft privacy content.');
});

it('can unpublish a live page', function () {
    $manager = userWithPermissions(['cms.pages.manage', 'cms.pages.publish']);
    $reader = userWithPermissions(['cms.published.view']);
    $store = Store::factory()->create(['locale' => 'en-US']);

    $pageId = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages", cmsPagePayload())
        ->json('data.id');

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}/publish", ['expected_version' => 1])
        ->assertOk();

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}/unpublish", ['expected_version' => 2])
        ->assertOk()
        ->assertJsonPath('data.status', 'draft');

    $this->actingAs($reader, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/published/privacy-policy?locale=en-US")
        ->assertNotFound();
});

it('restores an earlier revision into the draft without changing the live snapshot', function () {
    $manager = userWithPermissions(['cms.pages.view', 'cms.pages.manage', 'cms.pages.publish']);
    $reader = userWithPermissions(['cms.published.view']);
    $store = Store::factory()->create(['locale' => 'en-US']);

    $created = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages", cmsPagePayload())
        ->assertCreated();
    $pageId = $created->json('data.id');

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}/publish", ['expected_version' => 1])
        ->assertOk();

    $updated = $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}", [
            'title' => 'Changed Draft',
            'expected_version' => 2,
        ])
        ->assertOk();

    $revisions = $this->actingAs($manager, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}/revisions")
        ->assertOk();

    $originalRevision = collect($revisions->json('data'))->first(fn (array $revision) => ($revision['snapshot']['title'] ?? null) === 'Privacy Policy');
    expect($originalRevision)->not->toBeNull();

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}/revisions/{$originalRevision['id']}/restore", [
            'expected_version' => $updated->json('data.lockVersion'),
        ])
        ->assertOk()
        ->assertJsonPath('data.title', 'Privacy Policy');

    $this->actingAs($reader, 'sanctum')
        ->getJson("/api/v1/stores/{$store->id}/cms/published/privacy-policy?locale=en-US")
        ->assertOk()
        ->assertJsonPath('data.title', 'Privacy Policy');
});

it('enforces store boundaries and optimistic locking', function () {
    $manager = userWithPermissions(['cms.pages.view', 'cms.pages.manage']);
    $store = Store::factory()->create(['locale' => 'en-US']);
    $otherStore = Store::factory()->create(['locale' => 'en-US']);

    $pageId = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages", cmsPagePayload())
        ->json('data.id');

    $this->actingAs($manager, 'sanctum')
        ->getJson("/api/v1/stores/{$otherStore->id}/cms/pages/{$pageId}")
        ->assertNotFound();

    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}", [
            'title' => 'First update',
            'expected_version' => 1,
        ])
        ->assertOk();

    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/stores/{$store->id}/cms/pages/{$pageId}", [
            'title' => 'Stale update',
            'expected_version' => 1,
        ])
        ->assertStatus(409)
        ->assertJsonPath('error.type', 'conflict');
});

it('rejects duplicate store-and-locale slugs', function () {
    $manager = userWithPermissions(['cms.pages.manage']);
    $store = Store::factory()->create(['locale' => 'en-US']);

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages", cmsPagePayload())
        ->assertCreated();

    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/stores/{$store->id}/cms/pages", cmsPagePayload(['title' => 'Duplicate']))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});
