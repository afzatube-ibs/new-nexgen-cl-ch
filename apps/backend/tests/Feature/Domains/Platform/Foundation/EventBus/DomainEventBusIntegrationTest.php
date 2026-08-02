<?php

declare(strict_types=1);

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\Foundation\EventBus\DomainEvent;
use App\Domains\Platform\Foundation\EventBus\LaravelDomainEventBus;

// Proves the publish→subscribe mechanism itself works end to end through
// the real container-bound DomainEventBus — Platform Foundation's
// Implementation Master Plan acceptance criterion "all modules can
// publish/subscribe." No business module exists yet to exercise this with,
// so a synthetic event/listener pair lives here in the test suite rather
// than inventing a fake module under app/, per the implementation plan.

final class WidgetProvisionedForTest extends DomainEvent
{
    public function __construct(public readonly string $widgetId, ?string $correlationId = null)
    {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'test.widget.provisioned';
    }
}

it('is bound to the Laravel-backed implementation by default', function () {
    expect($this->app->make(DomainEventBus::class))->toBeInstanceOf(LaravelDomainEventBus::class);
});

it('delivers a published event to every subscriber registered for its class', function () {
    $bus = $this->app->make(DomainEventBus::class);

    $received = [];
    $bus->subscribe(WidgetProvisionedForTest::class, function (WidgetProvisionedForTest $event) use (&$received) {
        $received[] = $event->widgetId;
    });

    $bus->publish(new WidgetProvisionedForTest('widget-1'));
    $bus->publish(new WidgetProvisionedForTest('widget-2'));

    expect($received)->toBe(['widget-1', 'widget-2']);
});

it('does not deliver an event to a subscriber registered for a different event class', function () {
    $bus = $this->app->make(DomainEventBus::class);

    $calls = 0;
    $bus->subscribe(SomeOtherEventForTest::class, function () use (&$calls) {
        $calls++;
    });

    $bus->publish(new WidgetProvisionedForTest('widget-1'));

    expect($calls)->toBe(0);
});

it('preserves the correlation id on the event a subscriber receives', function () {
    $bus = $this->app->make(DomainEventBus::class);

    $seenCorrelationId = null;
    $bus->subscribe(WidgetProvisionedForTest::class, function (WidgetProvisionedForTest $event) use (&$seenCorrelationId) {
        $seenCorrelationId = $event->correlationId;
    });

    $bus->publish(new WidgetProvisionedForTest('widget-1', correlationId: 'corr-abc-123'));

    expect($seenCorrelationId)->toBe('corr-abc-123');
});

final class SomeOtherEventForTest extends DomainEvent
{
    public function name(): string
    {
        return 'test.some.other.event';
    }
}
