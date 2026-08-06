<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ReturnRequestItemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A line item within a ReturnRequest — see the return_request_items
 * migration's docblock, including why `sku` is a plain string, never a
 * Catalog foreign key.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $return_request_id
 * @property string $sku
 * @property string|null $description
 * @property int $quantity
 */
final class ReturnRequestItem extends Model
{
    /** @use HasFactory<ReturnRequestItemFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'return_request_id',
        'sku',
        'description',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $item): void {
            $item->tenant_id ??= TenantId::DEFAULT;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ReturnRequestItemFactory
     */
    protected static function newFactory(): Factory
    {
        return ReturnRequestItemFactory::new();
    }

    /**
     * @return BelongsTo<ReturnRequest, $this>
     */
    public function returnRequest(): BelongsTo
    {
        return $this->belongsTo(ReturnRequest::class);
    }
}
