<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\IdentityAccess\Models\User;
use App\Domains\Platform\Installer\Models\Installation;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Support\Facades\Cache;

// The `install` rate limiter is IP-keyed and backed by the Redis cache
// store (see .env's CACHE_STORE) — RefreshDatabase never touches it, and
// this test file alone calls POST /api/v1/install far more than its 5-
// per-minute limit. Flushing the whole cache before every test is this
// file's own TESTING:TEST_ISOLATION guard, made necessary by this module
// being the first one with an unauthenticated, IP-keyed rate limiter.
beforeEach(fn () => Cache::flush());

function installAdminPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'First Administrator',
        'email' => 'admin@nexgen-demo.test',
        'password' => 'Str0ng!Passw0rd#One',
        'password_confirmation' => 'Str0ng!Passw0rd#One',
    ], $overrides);
}

function installStorePayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'neXgen Demo Store',
        'legal_name' => 'neXgen Demo Store LLC',
        'currency_code' => 'USD',
        'locale' => 'en-US',
        'timezone' => 'America/New_York',
        'contact_email' => 'ops@nexgen-demo.test',
        'contact_phone' => '+1-202-555-0100',
        'address_line1' => '1 Market Street',
        'address_line2' => 'Suite 400',
        'city' => 'San Francisco',
        'region' => 'CA',
        'postal_code' => '94105',
        'country_code' => 'US',
    ], $overrides);
}

it('reports not installed when no installation exists', function () {
    $this->getJson('/api/v1/install/status')
        ->assertOk()
        ->assertJsonPath('data.installed', false);
});

it('reports installed once an installation exists', function () {
    Installation::factory()->create();

    $this->getJson('/api/v1/install/status')
        ->assertOk()
        ->assertJsonPath('data.installed', true);
});

it('installs the platform given a valid administrator and store, requiring no authentication', function () {
    Role::query()->create(['name' => 'administrator', 'label' => 'Administrator']);

    $response = $this->postJson('/api/v1/install', [
        'admin' => installAdminPayload(),
        'store' => installStorePayload(),
    ]);

    $response->assertCreated()->assertJsonStructure(['data' => ['id', 'installedBy', 'installedAt']]);

    $user = User::query()->where('email', 'admin@nexgen-demo.test')->first();
    expect($user)->not->toBeNull();
    expect($user->roles()->where('name', 'administrator')->exists())->toBeTrue();

    expect(Store::query()->where('contact_email', 'ops@nexgen-demo.test')->exists())->toBeTrue();
    expect(Installation::query()->count())->toBe(1);
    expect(Installation::query()->first()->installed_by)->toBe($user->id);
});

it('refuses to install a second time', function () {
    Role::query()->create(['name' => 'administrator', 'label' => 'Administrator']);
    Installation::factory()->create();

    $response = $this->postJson('/api/v1/install', [
        'admin' => installAdminPayload(),
        'store' => installStorePayload(),
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
    expect(User::query()->where('email', 'admin@nexgen-demo.test')->exists())->toBeFalse();
});

it('refuses to install before the administrator role exists', function () {
    $response = $this->postJson('/api/v1/install', [
        'admin' => installAdminPayload(),
        'store' => installStorePayload(),
    ]);

    $response->assertStatus(503)->assertJsonPath('error.type', 'service_unavailable');
    expect(User::query()->where('email', 'admin@nexgen-demo.test')->exists())->toBeFalse();
});

it('rejects a weak administrator password', function () {
    Role::query()->create(['name' => 'administrator', 'label' => 'Administrator']);

    $response = $this->postJson('/api/v1/install', [
        'admin' => installAdminPayload(['password' => 'password', 'password_confirmation' => 'password']),
        'store' => installStorePayload(),
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'validation_failed');
});

it('rejects a malformed administrator email', function () {
    Role::query()->create(['name' => 'administrator', 'label' => 'Administrator']);

    $response = $this->postJson('/api/v1/install', [
        'admin' => installAdminPayload(['email' => 'not-an-email']),
        'store' => installStorePayload(),
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed')
        ->assertJsonStructure(['error' => ['details' => ['admin.email']]]);
});

it('rejects an administrator email already in use', function () {
    Role::query()->create(['name' => 'administrator', 'label' => 'Administrator']);
    User::factory()->create(['email' => 'admin@nexgen-demo.test']);

    $response = $this->postJson('/api/v1/install', [
        'admin' => installAdminPayload(),
        'store' => installStorePayload(),
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'validation_failed');
});

it('rejects a malformed store currency code', function () {
    Role::query()->create(['name' => 'administrator', 'label' => 'Administrator']);

    $response = $this->postJson('/api/v1/install', [
        'admin' => installAdminPayload(),
        'store' => installStorePayload(['currency_code' => 'US']),
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed')
        ->assertJsonStructure(['error' => ['details' => ['store.currency_code']]]);
});

it('rejects a store timezone that is not a real IANA identifier', function () {
    Role::query()->create(['name' => 'administrator', 'label' => 'Administrator']);

    $response = $this->postJson('/api/v1/install', [
        'admin' => installAdminPayload(),
        'store' => installStorePayload(['timezone' => 'Not/AZone']),
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed')
        ->assertJsonStructure(['error' => ['details' => ['store.timezone']]]);
});
