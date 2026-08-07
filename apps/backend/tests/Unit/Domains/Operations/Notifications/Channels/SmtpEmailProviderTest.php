<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Channels\SmtpEmailProvider;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendRequest;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;

/**
 * SmtpEmailProvider talks to a real SMTP server over a real socket
 * (Symfony Mailer's EsmtpTransport) — this project has no fake SMTP
 * server to send a genuine success through in an automated test, so this
 * file deliberately covers only what is honestly testable without one:
 * isAvailable()'s configuration guard, and a genuine failed send against
 * a real-but-closed local port (an actual connection-refused failure,
 * not a mock), which exercises this provider's TransportExceptionInterface
 * handling for real. The success path is covered by this module's own
 * live smoke test against a real mailbox.
 */
it('is unavailable without a configured host', function () {
    $provider = new SmtpEmailProvider(['from_address' => 'no-reply@example.test']);

    expect($provider->isAvailable())->toBeFalse();
});

it('is available with a host and from_address configured', function () {
    $provider = new SmtpEmailProvider(['host' => 'smtp.example.test', 'from_address' => 'no-reply@example.test']);

    expect($provider->isAvailable())->toBeTrue();
});

it('reports its channel as email', function () {
    $provider = new SmtpEmailProvider(['host' => 'smtp.example.test', 'from_address' => 'no-reply@example.test']);

    expect($provider->channel())->toBe(NotificationTemplate::CHANNEL_EMAIL);
    expect($provider->code())->toBe('smtp');
});

it('reports a genuine connection failure honestly rather than throwing', function () {
    $provider = new SmtpEmailProvider([
        'host' => '127.0.0.1',
        'port' => 1,
        'from_address' => 'no-reply@example.test',
    ]);

    $result = $provider->send(new NotificationSendRequest(
        recipient: 'customer@example.test',
        subject: 'Test',
        body: 'Hello',
    ));

    expect($result->succeeded())->toBeFalse();
    expect($result->failureReason)->not->toBeNull();
});
