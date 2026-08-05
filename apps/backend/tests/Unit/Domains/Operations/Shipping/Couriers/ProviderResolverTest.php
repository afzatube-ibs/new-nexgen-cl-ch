<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Couriers\ManualProvider;
use App\Domains\Operations\Shipping\Couriers\ProviderFactory;
use App\Domains\Operations\Shipping\Couriers\ProviderRegistry;
use App\Domains\Operations\Shipping\Couriers\ProviderResolver;
use App\Domains\Operations\Shipping\Couriers\SteadfastProvider;
use App\Domains\Operations\Shipping\Couriers\SundarbanProvider;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Exceptions\UnsupportedShippingProviderException;

it('resolves a registered, available provider', function () {
    $registry = new ProviderRegistry;
    $registry->register(new ManualProvider);
    $resolver = new ProviderResolver($registry);

    expect($resolver->resolve('manual')->code())->toBe('manual');
});

it('refuses to resolve an unregistered provider', function () {
    $resolver = new ProviderResolver(new ProviderRegistry);

    expect(fn () => $resolver->resolve('nonexistent'))->toThrow(UnsupportedShippingProviderException::class);
});

it('refuses to resolve a registered but unavailable provider', function () {
    $registry = new ProviderRegistry;
    $registry->register(new SteadfastProvider(['api_key' => null, 'secret_key' => null]));
    $resolver = new ProviderResolver($registry);

    expect(fn () => $resolver->resolve('steadfast'))->toThrow(UnsupportedShippingProviderException::class);
});

it('resolves a courier once its required credentials are configured', function () {
    $registry = new ProviderRegistry;
    $registry->register(new SteadfastProvider(['api_key' => 'key', 'secret_key' => 'secret']));
    $resolver = new ProviderResolver($registry);

    expect($resolver->resolve('steadfast')->code())->toBe('steadfast');
});

it('excludes unavailable providers from availableProviders() but includes them in allProviders()', function () {
    $registry = new ProviderRegistry;
    $registry->register(new ManualProvider);
    $registry->register(new SundarbanProvider);
    $resolver = new ProviderResolver($registry);

    expect(array_map(fn ($p) => $p->code(), $resolver->availableProviders()))->toBe(['manual']);
    expect(array_map(fn ($p) => $p->code(), $resolver->allProviders()))->toBe(['manual', 'sundarban']);
});

it('honestly reports no live rate-quote support for any Bangladesh-first courier shipped with this module', function () {
    foreach (['manual', 'steadfast', 'pathao', 'redx', 'paperfly', 'sundarban', 'ecourier'] as $code) {
        $provider = (new ProviderFactory)->make($code, []);

        expect($provider->supportsLiveRateQuote())->toBeFalse();
        expect($provider->quoteLiveRate(new ShippingRateQuoteRequest('BD', 'BD', '', 500)))->toBeNull();
    }
});
