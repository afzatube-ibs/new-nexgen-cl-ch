<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Exceptions\InvalidNotificationStatusTransitionException;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('allows the normal pending -> queued -> sending -> sent path', function () {
    $notification = Notification::factory()->create();

    $notification->assertCanTransitionTo(Notification::STATUS_QUEUED);
    $notification->status = Notification::STATUS_QUEUED;

    $notification->assertCanTransitionTo(Notification::STATUS_SENDING);
    $notification->status = Notification::STATUS_SENDING;

    $notification->assertCanTransitionTo(Notification::STATUS_SENT);
})->throwsNoExceptions();

it('rejects skipping a step (pending straight to sending)', function () {
    $notification = Notification::factory()->create();

    expect(fn () => $notification->assertCanTransitionTo(Notification::STATUS_SENDING))
        ->toThrow(InvalidNotificationStatusTransitionException::class);
});

it('allows a failed notification to be retried back to queued', function () {
    $notification = Notification::factory()->failed()->create();

    expect($notification->canTransitionTo(Notification::STATUS_QUEUED))->toBeTrue();
});

it('treats sent and cancelled as terminal with no further transitions', function () {
    $sent = Notification::factory()->sent()->create();
    $cancelled = Notification::factory()->cancelled()->create();

    expect($sent->isTerminal())->toBeTrue();
    expect($cancelled->isTerminal())->toBeTrue();
    expect($sent->canTransitionTo(Notification::STATUS_QUEUED))->toBeFalse();
    expect($cancelled->canTransitionTo(Notification::STATUS_QUEUED))->toBeFalse();
});

it('does not consider pending, queued, sending, or failed terminal', function () {
    expect(Notification::factory()->create()->isTerminal())->toBeFalse();
    expect(Notification::factory()->queued()->create()->isTerminal())->toBeFalse();
    expect(Notification::factory()->sending()->create()->isTerminal())->toBeFalse();
    expect(Notification::factory()->failed()->create()->isTerminal())->toBeFalse();
});

it('allows cancellation from pending and queued', function () {
    expect(Notification::factory()->create()->canTransitionTo(Notification::STATUS_CANCELLED))->toBeTrue();
    expect(Notification::factory()->queued()->create()->canTransitionTo(Notification::STATUS_CANCELLED))->toBeTrue();
});

it('refuses cancellation once sending has started', function () {
    $notification = Notification::factory()->sending()->create();

    expect($notification->canTransitionTo(Notification::STATUS_CANCELLED))->toBeFalse();
});

it('reports hasExhaustedRetries() correctly', function () {
    $withRoom = Notification::factory()->create(['attempts_count' => 2, 'max_attempts' => 5]);
    $exhausted = Notification::factory()->create(['attempts_count' => 5, 'max_attempts' => 5]);

    expect($withRoom->hasExhaustedRetries())->toBeFalse();
    expect($exhausted->hasExhaustedRetries())->toBeTrue();
});
