<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Channels\SesEmailProvider;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;

/**
 * See SmtpEmailProviderTest's own docblock — SesEmailProvider reuses the
 * identical SMTP transport mechanism (SES's own documented SMTP
 * interface), so the same honest-coverage reasoning applies: no real AWS
 * SES SMTP credentials exist in this test environment.
 */
it('is unavailable without full credentials', function () {
    $provider = new SesEmailProvider(['region' => 'us-east-1']);

    expect($provider->isAvailable())->toBeFalse();
});

it('is available with full credentials configured', function () {
    $provider = new SesEmailProvider([
        'region' => 'us-east-1',
        'smtp_username' => 'AKIAEXAMPLE',
        'smtp_password' => 'secret',
        'from_address' => 'no-reply@example.test',
    ]);

    expect($provider->isAvailable())->toBeTrue();
});

it('reports its channel as email', function () {
    $provider = new SesEmailProvider([
        'region' => 'us-east-1',
        'smtp_username' => 'AKIAEXAMPLE',
        'smtp_password' => 'secret',
        'from_address' => 'no-reply@example.test',
    ]);

    expect($provider->channel())->toBe(NotificationTemplate::CHANNEL_EMAIL);
    expect($provider->code())->toBe('ses');
});
