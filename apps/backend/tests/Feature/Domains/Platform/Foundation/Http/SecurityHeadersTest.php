<?php

declare(strict_types=1);

/**
 * Phase 1.1 Production Hardening regression test — see
 * Foundation\Http\Middleware\SecurityHeaders' own docblock for the
 * rationale behind each header's specific value.
 */
it('sets baseline security headers on every response, including an error response', function () {
    // Deliberately an unauthenticated request (a 401) rather than a
    // successful one — these headers must apply platform-wide, per the
    // middleware's own "global append, not opt-in per route" placement,
    // including on paths that never reach a controller.
    $response = $this->getJson('/api/v1/search/products');

    $response->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'no-referrer')
        ->assertHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()')
        ->assertHeader('Content-Security-Policy', "default-src 'none'")
        ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});
