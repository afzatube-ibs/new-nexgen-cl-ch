<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Channels\MailgunEmailProvider;
use App\Domains\Operations\Notifications\Channels\ProviderRegistry;
use App\Domains\Operations\Notifications\Channels\ProviderResolver;
use App\Domains\Operations\Notifications\Channels\SmtpEmailProvider;
use App\Domains\Operations\Notifications\Exceptions\UnsupportedNotificationProviderException;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Http\Client\Factory as HttpFactory;
use Tests\TestCase;

uses(TestCase::class);

it('resolves a registered, available provider by code', function () {
    $registry = new ProviderRegistry;
    $registry->register(new SmtpEmailProvider(['host' => 'smtp.example.test', 'from_address' => 'a@example.test']));
    $resolver = new ProviderResolver($registry);

    expect($resolver->resolve('smtp')->code())->toBe('smtp');
});

it('refuses to resolve an unregistered provider', function () {
    $resolver = new ProviderResolver(new ProviderRegistry);

    expect(fn () => $resolver->resolve('nonexistent'))->toThrow(UnsupportedNotificationProviderException::class);
});

it('refuses to resolve a registered but unavailable provider', function () {
    $registry = new ProviderRegistry;
    $registry->register(new SmtpEmailProvider([]));
    $resolver = new ProviderResolver($registry);

    expect(fn () => $resolver->resolve('smtp'))->toThrow(UnsupportedNotificationProviderException::class);
});

it('resolves the first available provider for a channel', function () {
    $registry = new ProviderRegistry;
    $registry->register(new SmtpEmailProvider([])); // unavailable
    $registry->register(new MailgunEmailProvider([
        'api_key' => 'key', 'domain' => 'mg.example.test', 'from_address' => 'a@example.test',
    ], app(HttpFactory::class)));
    $resolver = new ProviderResolver($registry);

    expect($resolver->resolveForChannel(NotificationTemplate::CHANNEL_EMAIL)->code())->toBe('mailgun');
});

it('refuses to resolve a channel with no available provider', function () {
    $registry = new ProviderRegistry;
    $registry->register(new SmtpEmailProvider([]));
    $resolver = new ProviderResolver($registry);

    expect(fn () => $resolver->resolveForChannel(NotificationTemplate::CHANNEL_EMAIL))
        ->toThrow(UnsupportedNotificationProviderException::class);
});

it('excludes unavailable providers from availableProviders() but includes them in allProviders()', function () {
    $registry = new ProviderRegistry;
    $registry->register(new SmtpEmailProvider(['host' => 'smtp.example.test', 'from_address' => 'a@example.test']));
    $registry->register(new MailgunEmailProvider([], app(HttpFactory::class))); // unavailable — no credentials
    $resolver = new ProviderResolver($registry);

    expect(array_map(fn ($p) => $p->code(), $resolver->availableProviders()))->toBe(['smtp']);
    expect(array_map(fn ($p) => $p->code(), $resolver->allProviders()))->toBe(['smtp', 'mailgun']);
});
