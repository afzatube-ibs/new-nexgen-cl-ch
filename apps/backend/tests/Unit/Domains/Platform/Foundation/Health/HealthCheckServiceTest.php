<?php

declare(strict_types=1);

use App\Domains\Platform\Foundation\Health\Contracts\HealthCheck;
use App\Domains\Platform\Foundation\Health\HealthCheckResult;
use App\Domains\Platform\Foundation\Health\HealthCheckService;
use Tests\TestCase;

// Uses the framework's Log facade on the exception-isolation path, so it
// needs the container booted — otherwise this is pure isolated logic.
uses(TestCase::class);

function fakeHealthCheck(string $name, bool $healthy): HealthCheck
{
    return new class($name, $healthy) implements HealthCheck
    {
        public function __construct(private string $checkName, private bool $healthy) {}

        public function name(): string
        {
            return $this->checkName;
        }

        public function check(): HealthCheckResult
        {
            return $this->healthy
                ? HealthCheckResult::healthy($this->checkName, 'ok', 1.0)
                : HealthCheckResult::unhealthy($this->checkName, 'not ok', 1.0);
        }
    };
}

function throwingHealthCheck(string $name): HealthCheck
{
    return new class($name) implements HealthCheck
    {
        public function __construct(private string $checkName) {}

        public function name(): string
        {
            return $this->checkName;
        }

        public function check(): HealthCheckResult
        {
            throw new RuntimeException('simulated dependency failure');
        }
    };
}

it('reports healthy overall when every check is healthy', function () {
    $service = new HealthCheckService([
        fakeHealthCheck('a', true),
        fakeHealthCheck('b', true),
    ]);

    $report = $service->run();

    expect($report['healthy'])->toBeTrue()
        ->and($report['checks'])->toHaveCount(2);
});

it('reports unhealthy overall when any single check is unhealthy', function () {
    $service = new HealthCheckService([
        fakeHealthCheck('a', true),
        fakeHealthCheck('b', false),
    ]);

    $report = $service->run();

    expect($report['healthy'])->toBeFalse();
});

it('isolates one check throwing so every other check still runs and is reported', function () {
    $service = new HealthCheckService([
        fakeHealthCheck('a', true),
        throwingHealthCheck('b'),
        fakeHealthCheck('c', true),
    ]);

    $report = $service->run();

    expect($report['healthy'])->toBeFalse()
        ->and($report['checks'])->toHaveCount(3);

    $names = array_column($report['checks'], 'name');
    expect($names)->toBe(['a', 'b', 'c']);

    $bResult = collect($report['checks'])->firstWhere('name', 'b');
    expect($bResult['status'])->toBe('unhealthy');
});

it('never leaks the throwing check exception message into the returned result', function () {
    $service = new HealthCheckService([throwingHealthCheck('b')]);

    $report = $service->run();

    expect($report['checks'][0]['message'])->not->toContain('simulated dependency failure');
});
