<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('allows the happy-path forward transitions', function () {
    $order = Order::factory()->make(['status' => Order::STATUS_PENDING]);
    expect($order->canTransitionTo(Order::STATUS_CONFIRMED))->toBeTrue();

    $order->status = Order::STATUS_CONFIRMED;
    expect($order->canTransitionTo(Order::STATUS_PROCESSING))->toBeTrue();

    $order->status = Order::STATUS_PROCESSING;
    expect($order->canTransitionTo(Order::STATUS_SHIPPED))->toBeTrue();

    $order->status = Order::STATUS_SHIPPED;
    expect($order->canTransitionTo(Order::STATUS_DELIVERED))->toBeTrue();
});

it('allows cancellation from pending, confirmed, or processing', function () {
    foreach ([Order::STATUS_PENDING, Order::STATUS_CONFIRMED, Order::STATUS_PROCESSING] as $status) {
        $order = Order::factory()->make(['status' => $status]);
        expect($order->canTransitionTo(Order::STATUS_CANCELLED))->toBeTrue();
    }
});

it('rejects skipping a stage in the lifecycle', function () {
    $order = Order::factory()->make(['status' => Order::STATUS_PENDING]);

    expect($order->canTransitionTo(Order::STATUS_SHIPPED))->toBeFalse();
    expect($order->canTransitionTo(Order::STATUS_DELIVERED))->toBeFalse();
});

it('treats delivered and cancelled as terminal', function () {
    $delivered = Order::factory()->make(['status' => Order::STATUS_DELIVERED]);
    $cancelled = Order::factory()->make(['status' => Order::STATUS_CANCELLED]);

    expect($delivered->isTerminal())->toBeTrue();
    expect($cancelled->isTerminal())->toBeTrue();
    expect($delivered->canTransitionTo(Order::STATUS_CANCELLED))->toBeFalse();
    expect($cancelled->canTransitionTo(Order::STATUS_PENDING))->toBeFalse();
});

it('rejects shipping an order that was never confirmed or processed', function () {
    $order = Order::factory()->make(['status' => Order::STATUS_PENDING]);

    expect($order->canTransitionTo(Order::STATUS_SHIPPED))->toBeFalse();
});
