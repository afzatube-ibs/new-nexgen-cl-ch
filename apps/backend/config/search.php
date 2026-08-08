<?php

declare(strict_types=1);

/**
 * MODULE:SEARCH's engine configuration — mirrors config/notifications.php
 * and config/payments.php's own "engine/provider list plus a chosen
 * default" shape.
 *
 * Only `mysql_fulltext` is registered in this delivery, per ADR-0003's
 * operational-simplicity requirement (no specialized search engine to
 * install or operate) — see Engines\MySqlFullTextSearchEngine's own
 * docblock for the full rationale. `engines` is still a list, and
 * Engines\SearchEngineFactory still switches on a code rather than the
 * codebase hardcoding MySqlFullTextSearchEngine everywhere, so a future
 * engine (Elasticsearch, Meilisearch) is purely additive.
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Enabled Search Engines
    |--------------------------------------------------------------------------
    |
    | The ordered list of engine codes this installation offers, resolved
    | by Engines\SearchEngineFactory into concrete Engines\Contracts\
    | SearchEngineContract instances and registered into Engines\
    | SearchEngineRegistry by Providers\SearchServiceProvider::register().
    |
    */
    'engines' => explode(',', (string) env('SEARCH_ENGINES', 'mysql_fulltext')),

    /*
    |--------------------------------------------------------------------------
    | Default Search Engine
    |--------------------------------------------------------------------------
    |
    | The single engine code Engines\SearchEngineResolver::resolveDefault()
    | resolves to — unlike Notifications' per-channel provider selection,
    | this module always has exactly one active engine.
    |
    */
    'default_engine' => env('SEARCH_DEFAULT_ENGINE', 'mysql_fulltext'),

    /*
    |--------------------------------------------------------------------------
    | Reindex Chunk Size
    |--------------------------------------------------------------------------
    |
    | How many Catalog Products Actions\RebuildSearchIndexAction reads per
    | chunk during a full rebuild (Console\Commands\ReindexCommand) — keeps
    | memory bounded on a large catalog, mirroring every other module's own
    | chunked-processing precedent.
    |
    */
    'reindex_chunk_size' => (int) env('SEARCH_REINDEX_CHUNK_SIZE', 200),

];
