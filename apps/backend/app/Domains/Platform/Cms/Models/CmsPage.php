<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Models;

use App\Domains\Platform\Cms\Exceptions\ConcurrencyConflictException;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * MODULE:CMS page aggregate. Draft fields are editable; the Storefront
 * consumes only published_snapshot while status is published, so saving
 * a draft can never leak an unfinished edit to customers.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $store_id
 * @property string $slug
 * @property string $title
 * @property string $locale
 * @property array<int, array<string, mixed>> $content
 * @property string|null $meta_title
 * @property string|null $meta_description
 * @property string $status
 * @property array<string, mixed>|null $published_snapshot
 * @property Carbon|null $published_at
 * @property string|null $published_by
 * @property int $lock_version
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
final class CmsPage extends Model
{
    use HasUuids;

    public const string STATUS_DRAFT = 'draft';

    public const string STATUS_PUBLISHED = 'published';

    public const array EDITABLE_FIELDS = [
        'slug', 'title', 'locale', 'content', 'meta_title', 'meta_description',
    ];

    protected $fillable = ['store_id', ...self::EDITABLE_FIELDS];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'published_snapshot' => 'array',
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $page): void {
            $page->tenant_id ??= TenantId::DEFAULT;
            $page->status ??= self::STATUS_DRAFT;
            $page->lock_version ??= 1;
        });

        self::updating(function (self $page): void {
            $page->lock_version = (int) $page->getOriginal('lock_version') + 1;
        });
    }

    /** @return HasMany<CmsPageRevision, $this> */
    public function revisions(): HasMany
    {
        return $this->hasMany(CmsPageRevision::class, 'page_id')->latest('created_at');
    }

    public function assertVersionMatches(int $expectedVersion): void
    {
        $actualVersion = (int) $this->lock_version;
        if ($expectedVersion !== $actualVersion) {
            throw new ConcurrencyConflictException('CMS page', $this->id, $expectedVersion, $actualVersion);
        }
    }

    /** @return array<string, mixed> */
    public function draftSnapshot(): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'locale' => $this->locale,
            'content' => $this->content,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
        ];
    }
}
