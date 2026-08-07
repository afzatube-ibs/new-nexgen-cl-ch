<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Channels\BrevoEmailProvider;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendRequest;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

function brevoProvider(): BrevoEmailProvider
{
    return new BrevoEmailProvider([
        'api_key' => 'test-key',
        'from_address' => 'no-reply@example.test',
        'from_name' => 'neXgen',
    ], app(HttpFactory::class));
}

it('is unavailable without full credentials', function () {
    $provider = new BrevoEmailProvider(['api_key' => 'only-this'], app(HttpFactory::class));

    expect($provider->isAvailable())->toBeFalse();
});

it('is available with full credentials configured', function () {
    expect(brevoProvider()->isAvailable())->toBeTrue();
});

it('reports its channel as email', function () {
    expect(brevoProvider()->channel())->toBe(NotificationTemplate::CHANNEL_EMAIL);
});

it('sends via the transactional email API and reports success', function () {
    Http::fake([
        'api.brevo.com/*' => Http::response(['messageId' => '<brevo-id-1>']),
    ]);

    $result = brevoProvider()->send(new NotificationSendRequest(
        recipient: 'customer@example.test',
        subject: 'Test subject',
        body: '<p>Hello</p>',
    ));

    expect($result->succeeded())->toBeTrue();
    expect($result->providerReference)->toBe('<brevo-id-1>');

    Http::assertSent(fn ($request) => str_contains((string) $request->url(), 'smtp/email')
        && $request['to'][0]['email'] === 'customer@example.test');
});

it('reports failure honestly when Brevo rejects the request', function () {
    Http::fake([
        'api.brevo.com/*' => Http::response(['message' => 'Key not found'], 401),
    ]);

    $result = brevoProvider()->send(new NotificationSendRequest(
        recipient: 'customer@example.test',
        subject: 'Test subject',
        body: 'Hello',
    ));

    expect($result->succeeded())->toBeFalse();
    expect($result->failureReason)->toBe('Key not found');
});
