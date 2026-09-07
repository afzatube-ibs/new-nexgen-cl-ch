<?php

declare(strict_types=1);

use Illuminate\Console\Scheduling\Schedule;

it('schedules checkout expiry and payment reconciliation every five minutes without overlap', function () {
    $events = collect(app(Schedule::class)->events());

    $checkoutExpiry = $events->first(
        fn ($event): bool => str_contains((string) $event->command, 'checkout:expire-sessions')
    );
    $paymentReconciliation = $events->first(
        fn ($event): bool => str_contains((string) $event->command, 'payments:reconcile')
    );

    expect($checkoutExpiry)->not->toBeNull()
        ->and($checkoutExpiry->expression)->toBe('*/5 * * * *')
        ->and($checkoutExpiry->withoutOverlapping)->toBeTrue()
        ->and($paymentReconciliation)->not->toBeNull()
        ->and($paymentReconciliation->expression)->toBe('*/5 * * * *')
        ->and($paymentReconciliation->withoutOverlapping)->toBeTrue();
});
