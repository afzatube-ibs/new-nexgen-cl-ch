<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\EventBus\Contracts;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;
use Closure;

/**
 * The abstraction every module publishes to and subscribes through, per
 * ARCH:CROSS_DOMAIN_COMMUNICATION and MODULE:INTERACTION_RULES.
 *
 * The event bus is in-process for Phase 1, but no module is permitted to
 * know that — every module depends on this interface only, never on
 * Laravel's native event dispatcher directly (App\Domains\Platform\
 * Foundation\EventBus\LaravelDomainEventBus is the one place in the
 * codebase that touches it, and deptrac.yaml enforces that boundary
 * detectably). This is what makes a future move to a distributed message
 * broker, should multi-tenant SaaS scale ever require it, an extension of
 * this interface rather than a redesign of every module that publishes or
 * subscribes.
 */
interface DomainEventBus
{
    /**
     * Publish a domain event. The publishing module's own transaction has
     * already committed by the time this is called — DATA:TRANSACTION_
     * BOUNDARIES never spans the publish itself, only what caused it.
     */
    public function publish(DomainEvent $event): void;

    /**
     * Register a subscriber for a specific domain event class. A listener
     * receives exactly the fields the publishing module chose to expose on
     * that event class — SECURITY:EVENT_SECURITY holds by construction,
     * since the bus itself carries no additional context of its own.
     *
     * @param  class-string<DomainEvent>  $eventClass
     * @param  Closure(DomainEvent): void|class-string|array{0: class-string, 1: string}  $listener
     */
    public function subscribe(string $eventClass, Closure|string|array $listener): void;
}
