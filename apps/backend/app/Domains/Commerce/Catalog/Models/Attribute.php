<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Models;

use App\Domains\Commerce\Catalog\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\AttributeFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A typed, informational fact a Product may carry — see the attributes
 * migration's docblock for why this is distinct from Option/OptionValue.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string|null $attribute_group_id
 * @property string $code
 * @property string $name
 * @property string $type
 * @property bool $is_filterable
 * @property int $position
 * @property int $lock_version
 */
final class Attribute extends Model
{
    /** @use HasFactory<AttributeFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string TYPE_TEXT = 'text';

    public const string TYPE_NUMBER = 'number';

    public const string TYPE_BOOLEAN = 'boolean';

    public const string TYPE_SELECT = 'select';

    public const string TYPE_MULTISELECT = 'multiselect';

    public const string TYPE_DATE = 'date';

    /**
     * @return list<string>
     */
    public static function types(): array
    {
        return [
            self::TYPE_TEXT,
            self::TYPE_NUMBER,
            self::TYPE_BOOLEAN,
            self::TYPE_SELECT,
            self::TYPE_MULTISELECT,
            self::TYPE_DATE,
        ];
    }

    protected $fillable = [
        'attribute_group_id',
        'code',
        'name',
        'type',
        'is_filterable',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'is_filterable' => 'boolean',
        ];
    }

    /**
     * @return AttributeFactory
     */
    protected static function newFactory(): Factory
    {
        return AttributeFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $attribute): void {
            $attribute->tenant_id ??= TenantId::DEFAULT;
            $attribute->is_filterable ??= false;
            $attribute->lock_version ??= 1;
        });
    }

    /**
     * @return BelongsTo<AttributeGroup, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(AttributeGroup::class, 'attribute_group_id');
    }
}
