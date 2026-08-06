<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Models;

use Database\Factories\ReturnNoteFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An append-only annotation on a ReturnRequest — mirrors Orders' OrderNote
 * and Fulfillment's ShipmentNote exactly.
 *
 * @property string $id
 * @property string $return_request_id
 * @property string|null $author_id
 * @property string $body
 * @property bool $is_customer_visible
 */
final class ReturnNote extends Model
{
    /** @use HasFactory<ReturnNoteFactory> */
    use HasFactory, HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = [
        'return_request_id',
        'author_id',
        'body',
        'is_customer_visible',
    ];

    protected function casts(): array
    {
        return [
            'is_customer_visible' => 'boolean',
        ];
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ReturnNoteFactory
     */
    protected static function newFactory(): Factory
    {
        return ReturnNoteFactory::new();
    }

    /**
     * @return BelongsTo<ReturnRequest, $this>
     */
    public function returnRequest(): BelongsTo
    {
        return $this->belongsTo(ReturnRequest::class);
    }
}
