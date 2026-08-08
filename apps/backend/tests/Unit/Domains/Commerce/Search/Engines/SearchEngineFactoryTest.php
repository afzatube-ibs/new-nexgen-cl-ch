<?php

declare(strict_types=1);

use App\Domains\Commerce\Search\Engines\MySqlFullTextSearchEngine;
use App\Domains\Commerce\Search\Engines\SearchEngineFactory;
use App\Domains\Commerce\Search\Exceptions\UnsupportedSearchEngineException;

it('builds the mysql_fulltext engine', function () {
    $engine = (new SearchEngineFactory)->make('mysql_fulltext', []);

    expect($engine)->toBeInstanceOf(MySqlFullTextSearchEngine::class);
    expect($engine->code())->toBe('mysql_fulltext');
});

it('throws for an unknown engine code', function () {
    expect(fn () => (new SearchEngineFactory)->make('elasticsearch', []))
        ->toThrow(UnsupportedSearchEngineException::class);
});
