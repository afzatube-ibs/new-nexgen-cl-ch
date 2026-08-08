<?php

declare(strict_types=1);

use App\Domains\Commerce\Search\Engines\MySqlFullTextSearchEngine;
use App\Domains\Commerce\Search\Engines\SearchEngineRegistry;

it('registers and retrieves an engine by its own code', function () {
    $registry = new SearchEngineRegistry;
    $engine = new MySqlFullTextSearchEngine;

    $registry->register($engine);

    expect($registry->has('mysql_fulltext'))->toBeTrue();
    expect($registry->get('mysql_fulltext'))->toBe($engine);
});

it('returns null for an unregistered code', function () {
    $registry = new SearchEngineRegistry;

    expect($registry->get('does_not_exist'))->toBeNull();
    expect($registry->has('does_not_exist'))->toBeFalse();
});

it('lists every registered engine', function () {
    $registry = new SearchEngineRegistry;
    $registry->register(new MySqlFullTextSearchEngine);

    expect($registry->all())->toHaveCount(1);
});
