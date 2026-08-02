<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('denies viewing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/media-library/audit-logs')
        ->assertStatus(403);
});

it('lists audited media changes for a caller with the view permission', function () {
    Storage::fake('public');
    $caller = userWithPermissions(['media.assets.manage', 'media.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/media', [
        'file' => UploadedFile::fake()->image('photo.jpg'),
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/media-library/audit-logs');

    $response->assertOk();
    expect($response->json('data.*.action'))->toContain('media.uploaded');
});
