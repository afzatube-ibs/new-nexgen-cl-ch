<?php

declare(strict_types=1);

use App\Domains\Platform\Foundation\Health\Contracts\HealthCheck;
use App\Domains\Platform\Foundation\Health\HealthCheckResult;
use App\Domains\Platform\Foundation\Health\HealthCheckService;
use App\Domains\Platform\Foundation\Http\Middleware\AssignCorrelationId;
use Ramsey\Uuid\Uuid;

// Exercises GET /api/health against the real MySQL/Redis instances this
// project's tooling starts (phpunit.xml), per TESTING:ENVIRONMENT_STRATEGY —
// this endpoint's entire purpose is verifying real infrastructure, so a
// sqlite/array test double would test nothing meaningful.

it('reports 200 healthy when every real dependency is reachable', function () {
    $response = $this->getJson('/api/health');

    $response->assertOk()
        ->assertJsonPath('data.status', 'healthy')
        ->assertJsonCount(3, 'data.checks');

    foreach (['database', 'cache', 'queue'] as $expected) {
        expect(collect($response->json('data.checks'))->pluck('name'))->toContain($expected);
    }
});

it('carries a correlation id on the response, generating one if the caller supplied none', function () {
    $response = $this->getJson('/api/health');

    $response->assertHeader(AssignCorrelationId::HEADER);
    expect($response->headers->get(AssignCorrelationId::HEADER))->toBeUuid();
});

it('echoes back a caller-supplied correlation id unchanged', function () {
    $suppliedId = Uuid::uuid7()->toString();

    $response = $this->withHeaders([AssignCorrelationId::HEADER => $suppliedId])
        ->getJson('/api/health');

    $response->assertHeader(AssignCorrelationId::HEADER, $suppliedId);
});

it('reports 503 unhealthy when a dependency is down, without leaking exception detail', function () {
    $this->app->singleton(HealthCheckService::class, fn () => new HealthCheckService([
        new class implements HealthCheck
        {
            public function name(): string
            {
                return 'database';
            }

            public function check(): HealthCheckResult
            {
                return HealthCheckResult::unhealthy('database', 'Database is unreachable.', 5.0);
            }
        },
    ]));

    $response = $this->getJson('/api/health');

    $response->assertStatus(503)
        ->assertJsonPath('data.status', 'unhealthy')
        ->assertJsonPath('data.checks.0.message', 'Database is unreachable.');

    expect($response->getContent())->not->toContain('SQLSTATE');
});
