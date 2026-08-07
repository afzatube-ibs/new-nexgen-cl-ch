<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Channels\MailgunEmailProvider;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendRequest;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

function mailgunProvider(): MailgunEmailProvider
{
    return new MailgunEmailProvider([
        'api_key' => 'test-key',
        'domain' => 'mg.example.test',
        'region' => 'us',
        'from_address' => 'no-reply@example.test',
        'from_name' => 'neXgen',
    ], app(HttpFactory::class));
}

it('is unavailable without full credentials', function () {
    $provider = new MailgunEmailProvider(['api_key' => 'only-this'], app(HttpFactory::class));

    expect($provider->isAvailable())->toBeFalse();
});

it('is available with full credentials configured', function () {
    expect(mailgunProvider()->isAvailable())->toBeTrue();
});

it('reports its channel as email', function () {
    expect(mailgunProvider()->channel())->toBe(NotificationTemplate::CHANNEL_EMAIL);
});

it('sends via the Messages API and reports success', function () {
    Http::fake([
        'api.mailgun.net/*' => Http::response(['id' => '<mailgun-id-1>', 'message' => 'Queued.']),
    ]);

    $result = mailgunProvider()->send(new NotificationSendRequest(
        recipient: 'customer@example.test',
        subject: 'Test subject',
        body: '<p>Hello</p>',
    ));

    expect($result->succeeded())->toBeTrue();
    expect($result->providerReference)->toBe('<mailgun-id-1>');

    Http::assertSent(fn ($request) => str_contains((string) $request->url(), 'mg.example.test/messages')
        && $request['to'] === 'customer@example.test');
});

it('reports failure honestly when Mailgun rejects the request', function () {
    Http::fake([
        'api.mailgun.net/*' => Http::response(['message' => 'Domain not found: mg.example.test'], 400),
    ]);

    $result = mailgunProvider()->send(new NotificationSendRequest(
        recipient: 'customer@example.test',
        subject: 'Test subject',
        body: 'Hello',
    ));

    expect($result->succeeded())->toBeFalse();
    expect($result->failureReason)->toBe('Domain not found: mg.example.test');
});
