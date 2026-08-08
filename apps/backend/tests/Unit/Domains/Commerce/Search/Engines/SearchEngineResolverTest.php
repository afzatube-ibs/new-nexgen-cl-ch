<?php

declare(strict_types=1);

use App\Domains\Commerce\Search\Engines\MySqlFullTextSearchEngine;
use App\Domains\Commerce\Search\Engines\SearchEngineRegistry;
use App\Domains\Commerce\Search\Engines\SearchEngineResolver;
use App\Domains\Commerce\Search\Exceptions\UnsupportedSearchEngineException;
use Tests\TestCase;

// Boots the framework (for the config() helper) but touches no database,
// so neither RefreshDatabase nor DatabaseTruncation is needed here.
uses(TestCase::class);

it('resolves the configured default engine', function () {
    config(['search.default_engine' => 'mysql_fulltext']);

    $registry = new SearchEngineRegistry;
    $registry->register(new MySqlFullTextSearchEngine);

    $resolver = new SearchEngineResolver($registry);

    expect($resolver->resolveDefault())->toBeInstanceOf(MySqlFullTextSearchEngine::class);
});

it('throws when the configured default engine is not registered', function () {
    config(['search.default_engine' => 'not_registered']);

    $resolver = new SearchEngineResolver(new SearchEngineRegistry);

    expect(fn () => $resolver->resolveDefault())->toThrow(UnsupportedSearchEngineException::class);
});
