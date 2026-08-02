<?php

declare(strict_types=1);

use App\Domains\Platform\Media\Audit\AuditLog;
use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

it('denies uploading without the manage permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/media', ['file' => UploadedFile::fake()->image('photo.jpg')])
        ->assertStatus(403);
});

it('uploads an image, recording its dimensions, publishing MediaUploaded, and auditing it', function () {
    $caller = userWithPermissions(['media.assets.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/media', [
        'file' => UploadedFile::fake()->image('photo.jpg', 400, 300),
        'alt_text' => 'A product photo',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.width', 400)
        ->assertJsonPath('data.height', 300)
        ->assertJsonPath('data.altText', 'A product photo')
        ->assertJsonPath('data.version', 1);

    expect(AuditLog::query()->where('action', 'media.uploaded')->count())->toBe(1);

    $asset = MediaAsset::query()->firstOrFail();
    Storage::disk('public')->assertExists($asset->path);
});

it('rejects an unsupported file type', function () {
    $caller = userWithPermissions(['media.assets.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/media', ['file' => UploadedFile::fake()->create('script.exe', 10, 'application/x-msdownload')])
        ->assertStatus(422);
});

it('rejects a file exceeding the maximum size', function () {
    $caller = userWithPermissions(['media.assets.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/media', ['file' => UploadedFile::fake()->create('big.pdf', 20_000, 'application/pdf')])
        ->assertStatus(422);
});

it('lists media assets for a caller with the view permission', function () {
    $caller = userWithPermissions(['media.assets.view']);
    MediaAsset::factory()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/media');

    $response->assertOk();
    expect($response->json('meta.total'))->toBe(3);
});

it('updates alt text when the expected version matches', function () {
    $caller = userWithPermissions(['media.assets.manage']);
    $asset = MediaAsset::factory()->create(['alt_text' => 'Original']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/media/{$asset->id}", [
        'alt_text' => 'Updated',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.altText', 'Updated')->assertJsonPath('data.version', 2);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['media.assets.manage']);
    $asset = MediaAsset::factory()->create();
    $asset->update(['alt_text' => 'Already changed']);

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/media/{$asset->id}", ['alt_text' => 'Racing update', 'expected_version' => 1])
        ->assertStatus(409);
});

it('deletes and then restores a media asset', function () {
    $caller = userWithPermissions(['media.assets.manage']);
    $asset = MediaAsset::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/media/{$asset->id}", ['expected_version' => 1])
        ->assertStatus(204);

    expect(MediaAsset::query()->find($asset->id))->toBeNull();
    expect(MediaAsset::withTrashed()->find($asset->id))->not->toBeNull();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/media/{$asset->id}/restore")
        ->assertOk();

    expect(MediaAsset::query()->find($asset->id))->not->toBeNull();
    expect(AuditLog::query()->where('action', 'media.restored')->count())->toBe(1);
});
