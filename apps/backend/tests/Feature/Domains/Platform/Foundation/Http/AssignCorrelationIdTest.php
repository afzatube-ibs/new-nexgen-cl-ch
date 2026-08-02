<?php

declare(strict_types=1);

use App\Domains\Platform\Foundation\Http\Middleware\AssignCorrelationId;

it('rejects a caller-supplied header that is not a valid UUID and generates its own instead', function () {
    $response = $this->withHeaders([AssignCorrelationId::HEADER => 'not-a-uuid'])
        ->getJson('/api/health');

    $returned = $response->headers->get(AssignCorrelationId::HEADER);

    expect($returned)->not->toBe('not-a-uuid')
        ->and($returned)->toBeUuid();
});

it('generates a correlation id even for Laravel\'s own built-in liveness route', function () {
    $response = $this->get('/up');

    $response->assertHeader(AssignCorrelationId::HEADER);
});
