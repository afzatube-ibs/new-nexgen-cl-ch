<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Part of Product's aggregate — see the product_images migration's
 * docblock for why this carries no lock_version of its own, and for why
 * it references a MODULE:MEDIA asset by identifier rather than storing a
 * URL directly.
 *
 * @property string $id
 * @property string $product_id
 * @property string $media_id
 * @property int $position
 * @property bool $is_primary
 */
final class ProductImage extends Model
{
    use HasUuids;

    protected $fillable = ['media_id', 'position', 'is_primary'];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<MediaAsset, $this>
     */
    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'media_id');
    }
}
