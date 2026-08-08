<?php

declare(strict_types=1);

/**
 * Phase 1.1 Production Hardening regression test — see
 * Foundation\Providers\FoundationServiceProvider's own docblock for the
 * `api` RateLimiter this covers, and `bootstrap/app.php`'s
 * `TooManyRequestsHttpException` render mapping for why `Retry-After`
 * matters here specifically (a real gap found and fixed live during this
 * hardening pass, not a hypothetical).
 */
it('applies the platform-wide api rate limit and returns a clean 429 with Retry-After once exceeded', function () {
    // A low override keeps this test fast and deterministic rather than
    // actually issuing 120+ requests.
    config(['api.rate_limit_per_minute' => 3]);

    $caller = userWithPermissions(['search.products.view']);

    for ($i = 0; $i < 3; $i++) {
        $this->actingAs($caller, 'sanctum')
            ->getJson('/api/v1/search/products')
            ->assertOk()
            ->assertHeader('X-RateLimit-Limit', '3');
    }

    $blocked = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/search/products');

    $blocked->assertStatus(429)
        ->assertJsonPath('error.type', 'rate_limited');

    expect($blocked->headers->has('Retry-After'))->toBeTrue();
});

it('keys the api rate limit per authenticated user, not shared across different callers', function () {
    config(['api.rate_limit_per_minute' => 1]);

    $first = userWithPermissions(['search.products.view']);
    $second = userWithPermissions(['search.products.view']);

    $this->actingAs($first, 'sanctum')->getJson('/api/v1/search/products')->assertOk();
    $this->actingAs($first, 'sanctum')->getJson('/api/v1/search/products')->assertStatus(429);

    // A different authenticated caller has their own, unexhausted bucket.
    $this->actingAs($second, 'sanctum')->getJson('/api/v1/search/products')->assertOk();
});

it('lets a purpose-built, stricter route limiter apply without the general floor also stacking on it', function () {
    // Identity & Access's own `throttle:login` (5/minute) is deliberately
    // excluded from the general `api` floor (`withoutMiddleware
    // ('throttle:api')`, IdentityAccess\routes.php) — verified here by
    // exhausting login's own, much stricter limit and confirming the
    // block reports login's own 5, never the general floor's default
    // 120, which would otherwise mislead a caller about how many
    // attempts they actually have left.
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'nobody@example.test',
            'password' => 'wrong',
            'device_name' => 'test',
        ])->assertStatus(422);
    }

    $blocked = $this->postJson('/api/v1/auth/login', [
        'email' => 'nobody@example.test',
        'password' => 'wrong',
        'device_name' => 'test',
    ]);

    $blocked->assertStatus(429)->assertHeader('X-RateLimit-Limit', '5');
});
