<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use App\Domains\Platform\Media\Models\Concerns\HasOptimisticLocking;
use Database\Factories\MediaAssetFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

/**
 * MODULE:MEDIA's aggregate root. This is the one class other modules are
 * expected to read directly (never write) when they hold a `media_id`
 * reference — see the media_assets migration's docblock and Catalog's
 * ProductImage/Brand docblocks for the consuming side of this contract.
 * `url()` is what keeps that consumption read-only and storage-agnostic:
 * a consumer never touches the Storage facade or knows about `disk`/`path`
 * itself.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $disk
 * @property string $path
 * @property string $filename
 * @property string $mime_type
 * @property int $size
 * @property int|null $width
 * @property int|null $height
 * @property string|null $alt_text
 * @property string|null $uploaded_by
 * @property int $lock_version
 */
final class MediaAsset extends Model
{
    /** @use HasFactory<MediaAssetFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    protected $fillable = [
        'disk',
        'path',
        'filename',
        'mime_type',
        'size',
        'width',
        'height',
        'alt_text',
        'uploaded_by',
    ];

    /**
     * @return MediaAssetFactory
     */
    protected static function newFactory(): Factory
    {
        return MediaAssetFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $asset): void {
            $asset->tenant_id ??= TenantId::DEFAULT;
            $asset->lock_version ??= 1;
        });
    }

    public function url(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }
}
