<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * Production maintenance schedules. These commands already own their domain
 * behavior; this file only supplies the operational cadence so the dedicated
 * scheduler container in docker-compose.production.yml does real work.
 *
 * Both sweeps are intentionally frequent and idempotent. Payment reconciliation
 * itself applies PAYMENTS_RECONCILIATION_THRESHOLD_MINUTES before touching a
 * payment, so running the sweep every five minutes does not shorten that
 * business threshold. withoutOverlapping prevents a slow previous sweep from
 * stacking another copy on the same scheduler.
 */
Schedule::command('checkout:expire-sessions')
    ->everyFiveMinutes()
    ->withoutOverlapping();

Schedule::command('payments:reconcile')
    ->everyFiveMinutes()
    ->withoutOverlapping();
