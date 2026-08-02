<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single value within an Option (e.g. "Red" within "Color"). Part of
 * Option's aggregate — see the option_values migration's docblock for why
 * this carries no lock_version or soft delete of its own.
 *
 * @property string $id
 * @property string $option_id
 * @property string $value
 * @property string $slug
 * @property int $position
 */
final class OptionValue extends Model
{
    use HasUuids;

    protected $fillable = ['value', 'slug', 'position'];

    /**
     * @return BelongsTo<Option, $this>
     */
    public function option(): BelongsTo
    {
        return $this->belongsTo(Option::class);
    }
}
