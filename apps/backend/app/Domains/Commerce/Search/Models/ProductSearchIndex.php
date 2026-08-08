<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ProductSearchIndexFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * MODULE:SEARCH's only owned data — see the product_search_index
 * migration's own docblock for the full rationale. Deliberately carries
 * no `HasOptimisticLocking`/`lock_version`: this row is never edited by
 * a caller, only ever fully replaced by Actions\IndexProductAction
 * (system-maintained, per `DATA:SEARCH_INDEXING`'s "derived, never
 * authoritative" framing — there is no concurrent-user-edit scenario for
 * a cache).
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $product_id
 * @property string $sku
 * @property string $name
 * @property string $searchable_text
 * @property string $status
 * @property string $visibility
 * @property string|null $brand_id
 * @property Carbon|null $published_at
 */
final class ProductSearchIndex extends Model
{
    /** @use HasFactory<ProductSearchIndexFactory> */
    use HasFactory, HasUuids;

    protected $table = 'product_search_index';

    protected $fillable = [
        'product_id',
        'sku',
        'name',
        'searchable_text',
        'status',
        'visibility',
        'brand_id',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $entry): void {
            $entry->tenant_id ??= TenantId::DEFAULT;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ProductSearchIndexFactory
     */
    protected static function newFactory(): Factory
    {
        return ProductSearchIndexFactory::new();
    }
}
