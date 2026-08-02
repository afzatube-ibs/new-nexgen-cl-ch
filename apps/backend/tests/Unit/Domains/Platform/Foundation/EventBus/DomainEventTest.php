<?php

declare(strict_types=1);

use App\Domains\Platform\Foundation\EventBus\DomainEvent;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Illuminate\Support\Facades\Context;
use Tests\TestCase;

// DomainEvent legitimately depends on Laravel's Context facade (a Platform
// Foundation-owned ambient mechanism, not another business module), so this
// still verifies one class's own logic in isolation per TESTING:UNIT_TESTING
// — it simply needs the framework container Context relies on to be booted.
uses(TestCase::class);

final class TestOnlyDomainEvent extends DomainEvent
{
    public function name(): string
    {
        return 'test.only.event';
    }
}

it('assigns a stable, valid UUID identity that never encodes business meaning', function () {
    $event = new TestOnlyDomainEvent;

    expect($event->eventId)->toBeUuid();
});

it('assigns a fresh identity to every instance', function () {
    $first = new TestOnlyDomainEvent;
    $second = new TestOnlyDomainEvent;

    expect($first->eventId)->not->toBe($second->eventId);
});

it('records when it occurred', function () {
    $before = new DateTimeImmutable;
    $event = new TestOnlyDomainEvent;
    $after = new DateTimeImmutable;

    expect($event->occurredAt->getTimestamp())
        ->toBeGreaterThanOrEqual($before->getTimestamp())
        ->toBeLessThanOrEqual($after->getTimestamp());
});

it('defaults to the single-tenant installation identifier', function () {
    $event = new TestOnlyDomainEvent;

    expect($event->tenantId)->toBe(TenantId::DEFAULT);
});

it('accepts an explicit tenant id override', function () {
    $event = new TestOnlyDomainEvent(tenantId: 'some-future-tenant');

    expect($event->tenantId)->toBe('some-future-tenant');
});

it('honors an explicitly supplied correlation id over any ambient one', function () {
    Context::add('correlation_id', 'ambient-correlation-id');

    $event = new TestOnlyDomainEvent(correlationId: 'explicit-correlation-id');

    expect($event->correlationId)->toBe('explicit-correlation-id');
});

it('falls back to the ambient correlation id set by AssignCorrelationId middleware', function () {
    Context::add('correlation_id', 'ambient-correlation-id');

    $event = new TestOnlyDomainEvent;

    expect($event->correlationId)->toBe('ambient-correlation-id');
});

it('has no correlation id when none was supplied and none is ambient', function () {
    $event = new TestOnlyDomainEvent;

    expect($event->correlationId)->toBeNull();
});

it('exposes a stable, versioned name distinct from its PHP class name', function () {
    $event = new TestOnlyDomainEvent;

    expect($event->name())->toBe('test.only.event');
});
