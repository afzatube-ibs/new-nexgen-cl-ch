<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Shared slug generation for every Catalog aggregate that has one
 * (Product, Category, Brand, Collection, Tag, OptionValue) — the
 * "Slug generation" requirement. Deliberately Catalog-local rather than a
 * Platform Foundation utility: no other module has needed this yet, and
 * inventing a shared abstraction ahead of a second real consumer would
 * violate this project's "no premature abstraction" standard.
 */
final class SlugGenerator
{
    /**
     * Builds a unique slug from $source, scoped by whatever uniqueness
     * constraint $queryScope expresses (e.g. unique per tenant). Appends
     * -2, -3, etc. on collision.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $queryScope  A fresh, unexecuted query already
     *                                       scoped to the uniqueness boundary
     *                                       (tenant, parent, etc.) and, for an
     *                                       update, already excluding the
     *                                       current row.
     */
    public static function unique(string $source, Builder $queryScope, string $column = 'slug'): string
    {
        $base = Str::slug($source);
        $slug = $base;
        $suffix = 2;

        while ((clone $queryScope)->where($column, $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
