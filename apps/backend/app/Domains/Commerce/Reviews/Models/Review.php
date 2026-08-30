<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Models;

use App\Domains\Commerce\Reviews\Exceptions\InvalidReviewStatusTransitionException;
use App\Domains\Commerce\Reviews\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\ReviewFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Production Completion Plan v2, Milestone 11 (Reviews Foundation) — this
 * module's own aggregate root. See the reviews migration's own docblock
 * for the full rationale behind every column here.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $product_id
 * @property string $customer_id
 * @property string $author_name
 * @property string|null $order_id
 * @property int $rating
 * @property string|null $title
 * @property string $body
 * @property bool $verified_purchase
 * @property string $status
 * @property string|null $rejection_reason
 * @property string|null $merchant_response_body
 * @property string|null $merchant_responded_by
 * @property Carbon|null $merchant_responded_at
 * @property int $lock_version
 */
final class Review extends Model
{
    /** @use HasFactory<ReviewFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_PENDING = 'pending';

    public const string STATUS_APPROVED = 'approved';

    public const string STATUS_REJECTED = 'rejected';

    /**
     * Unlike Returns' own strict, one-way `ALLOWED_TRANSITIONS`, real
     * moderation is genuinely bidirectional: a rejected review can later
     * be approved on appeal, and an approved review can later be rejected
     * (reported for abuse after going live) — both real, ordinary
     * moderation actions, not an edge case.
     *
     * @var array<string, list<string>>
     */
    private const array TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_APPROVED, self::STATUS_REJECTED],
        self::STATUS_APPROVED => [self::STATUS_REJECTED],
        self::STATUS_REJECTED => [self::STATUS_APPROVED],
    ];

    protected $fillable = [
        'product_id',
        'customer_id',
        'author_name',
        'order_id',
        'rating',
        'title',
        'body',
        'verified_purchase',
        'status',
        'rejection_reason',
        'merchant_response_body',
        'merchant_responded_by',
        'merchant_responded_at',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'verified_purchase' => 'boolean',
            'merchant_responded_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $review): void {
            $review->tenant_id ??= TenantId::DEFAULT;
            $review->status ??= self::STATUS_PENDING;
            $review->verified_purchase ??= false;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default.
            $review->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return ReviewFactory
     */
    protected static function newFactory(): Factory
    {
        return ReviewFactory::new();
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    /**
     * @throws InvalidReviewStatusTransitionException
     */
    public function assertCanTransitionTo(string $target): void
    {
        if (! $this->canTransitionTo($target)) {
            throw new InvalidReviewStatusTransitionException($this->id, $this->status, $target);
        }
    }

    public function hasMerchantResponse(): bool
    {
        return $this->merchant_response_body !== null;
    }
}
