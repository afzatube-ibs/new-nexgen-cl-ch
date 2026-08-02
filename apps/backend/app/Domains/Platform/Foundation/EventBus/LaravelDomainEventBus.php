<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\EventBus;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Closure;
use Illuminate\Contracts\Events\Dispatcher;

/**
 * The Phase 1 implementation of the platform's domain event bus: an
 * in-process adapter over Laravel's native event dispatcher, per
 * ARCH:CROSS_DOMAIN_COMMUNICATION ("in-process for Phase 1... accessed
 * through an abstraction rather than called directly").
 *
 * This class — and nothing else in the codebase — is permitted to depend on
 * Illuminate\Contracts\Events\Dispatcher or the Event facade; deptrac.yaml
 * enforces that as a detectable architecture rule, not merely a documented
 * convention, per ENGINEERING:DOMAIN_BOUNDARY_ENFORCEMENT.
 */
final readonly class LaravelDomainEventBus implements DomainEventBus
{
    public function __construct(private Dispatcher $dispatcher) {}

    public function publish(DomainEvent $event): void
    {
        $this->dispatcher->dispatch($event);
    }

    public function subscribe(string $eventClass, Closure|string|array $listener): void
    {
        $this->dispatcher->listen($eventClass, $listener);
    }
}
