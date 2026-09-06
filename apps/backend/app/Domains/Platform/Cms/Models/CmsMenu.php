<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Models;

use App\Domains\Platform\Foundation\EventBus\TenantId;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $store_id
 * @property string $handle
 * @property string $title
 * @property array<int, array{id:string,label:string,href:string}> $items
 * @property string $status
 * @property array<string, mixed>|null $published_snapshot
 * @property Carbon|null $published_at
 * @property string|null $published_by
 * @property int $lock_version
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
final class CmsMenu extends Model
{
    use HasUuids;

    public const string STATUS_DRAFT = 'draft';

    public const string STATUS_PUBLISHED = 'published';

    protected $fillable = ['store_id', 'handle', 'title', 'items'];

    protected function casts(): array
    {
        return [
            'items' => 'array',
            'published_snapshot' => 'array',
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $menu): void {
            $menu->tenant_id ??= TenantId::DEFAULT;
            $menu->status ??= self::STATUS_DRAFT;
            $menu->lock_version ??= 1;
        });

        self::updating(function (self $menu): void {
            $menu->lock_version = (int) $menu->getOriginal('lock_version') + 1;
        });
    }

    public function assertVersionMatches(int $expectedVersion): void
    {
        if ($expectedVersion !== (int) $this->lock_version) {
            throw new ConflictHttpException('This menu changed since you opened it. Reload and try again.');
        }
    }

    /** @return array<string, mixed> */
    public function draftSnapshot(): array
    {
        return [
            'handle' => $this->handle,
            'title' => $this->title,
            'items' => $this->items,
        ];
    }
}
