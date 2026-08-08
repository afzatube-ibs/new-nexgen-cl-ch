<?php

declare(strict_types=1);

/**
 * Phase 1.1 Production Hardening regression test — see config/cors.php's
 * own docblock for the rationale behind these specific values.
 */
it('responds to a CORS preflight with the reviewed, explicit policy', function () {
    $response = $this->call('OPTIONS', '/api/v1/search/products', server: [
        'HTTP_ORIGIN' => 'https://example.test',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ]);

    $response->assertHeader('Access-Control-Allow-Origin', '*')
        ->assertHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

    expect($response->headers->get('Access-Control-Allow-Headers'))
        ->toContain('authorization')
        ->toContain('content-type');
});

it('never combines wildcard-origin CORS with credentialed requests', function () {
    // The one combination that would be a real vulnerability — see
    // config/cors.php's own docblock. Sanctum authenticates via a bearer
    // token in the Authorization header, never a cookie, so this must
    // stay false regardless of `allowed_origins`.
    expect(config('cors.supports_credentials'))->toBeFalse();
});
