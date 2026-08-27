<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Models;

use App\Domains\Commerce\Checkout\Exceptions\CheckoutSessionExpiredException;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutValidationException;
use App\Domains\Commerce\Checkout\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Carbon\CarbonImmutable;
use Database\Factories\CheckoutSessionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * MODULE:CHECKOUT's aggregate root — see the checkout_sessions
 * migration's docblock for the full field-by-field rationale.
 *
 * Status graph:
 *
 *   open <-> reviewed -> submitting -> submitted
 *     \          \            |
 *      \----------\-----------+--> expired
 *
 * Any cart-mutating action (add/update/remove item, change an address,
 * change the shipping option, apply/remove a coupon) moves a `reviewed`
 * session back to `open` — see Actions\ReviewCheckoutAction's docblock
 * for why stale totals must never be submittable. `submitting` is
 * transient: Actions\SubmitCheckoutAction's claim step sets it inside its
 * own single-aggregate transaction (the actual duplicate-submission
 * protection mechanism — see that class's docblock), and every code path
 * out of the saga either advances to `submitted` or reverts to
 * `reviewed`, so a session never observably rests in `submitting` outside
 * of an in-flight request. `expired` is terminal, reachable from `open`
 * or `reviewed` only, per the Console\Commands\ExpireCheckoutSessionsCommand
 * sweep.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string|null $customer_id
 * @property string|null $guest_email
 * @property string|null $guest_name
 * @property string $currency_code
 * @property array<string, mixed>|null $billing_address
 * @property array<string, mixed>|null $shipping_address
 * @property string|null $shipping_option_id
 * @property string|null $shipping_option_label
 * @property string|null $shipping_total
 * @property string|null $coupon_code
 * @property string|null $subtotal
 * @property string|null $discount_total
 * @property string|null $tax_total
 * @property string|null $grand_total
 * @property string $status
 * @property string|null $idempotency_key
 * @property string|null $order_id
 * @property Carbon $expires_at
 * @property int $lock_version
 */
final class CheckoutSession extends Model
{
    /** @use HasFactory<CheckoutSessionFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids;

    public const string STATUS_OPEN = 'open';

    public const string STATUS_REVIEWED = 'reviewed';

    public const string STATUS_SUBMITTING = 'submitting';

    public const string STATUS_SUBMITTED = 'submitted';

    public const string STATUS_EXPIRED = 'expired';

    /**
     * How long a freshly-created or freshly-touched session remains
     * valid before the expiration sweep may reclaim it — "genuinely
     * Temporary per DATA:LIFECYCLE," per this module's own Acceptance
     * Criteria in the master plan.
     */
    public const int LIFETIME_MINUTES = 60;

    protected $fillable = [
        'customer_id',
        'guest_email',
        'guest_name',
        'currency_code',
        'billing_address',
        'shipping_address',
        'shipping_option_id',
        'shipping_option_label',
        'shipping_total',
        'coupon_code',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'status',
        'idempotency_key',
        'order_id',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'billing_address' => 'array',
            'shipping_address' => 'array',
            'expires_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $session): void {
            $session->tenant_id ??= TenantId::DEFAULT;
            $session->status ??= self::STATUS_OPEN;
            $session->expires_at ??= now()->addMinutes(self::LIFETIME_MINUTES);
            $session->currency_code = strtoupper((string) $session->currency_code);
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $session->lock_version
            // immediately after creation would otherwise see null
            // instead of 1.
            $session->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return CheckoutSessionFactory
     */
    protected static function newFactory(): Factory
    {
        return CheckoutSessionFactory::new();
    }

    public function isGuest(): bool
    {
        return $this->customer_id === null;
    }

    public function isExpired(): bool
    {
        return CarbonImmutable::now()->gt($this->expires_at);
    }

    public function isReadyForReview(): bool
    {
        return in_array($this->status, [self::STATUS_OPEN, self::STATUS_REVIEWED], true);
    }

    /**
     * Extends this session's expiry by another full lifetime — called by
     * every cart-mutating action, so an actively-worked-on session never
     * expires out from under a customer mid-flow, only a genuinely
     * abandoned one.
     */
    public function touchExpiry(): void
    {
        $this->expires_at = now()->addMinutes(self::LIFETIME_MINUTES);
    }

    /**
     * Guard shared by every cart-mutating action (add/update/remove item,
     * set an address, select shipping, apply/remove a coupon): a session
     * that has expired, or that has already moved past `reviewed` toward
     * submission, refuses further mutation.
     */
    public function assertMutable(): void
    {
        if ($this->isExpired()) {
            throw new CheckoutSessionExpiredException($this->id);
        }

        if (! $this->isReadyForReview()) {
            throw new CheckoutValidationException(
                $this->id,
                'session_not_mutable',
                "Checkout session [{$this->id}] cannot be modified while status is [{$this->status}].",
            );
        }
    }

    /**
     * Any cart mutation invalidates a prior review — see this class's
     * docblock for why a `reviewed` session falls back to `open` rather
     * than staying reviewed with now-stale totals.
     */
    public function resetReviewIfNeeded(): void
    {
        if ($this->status === self::STATUS_REVIEWED) {
            $this->status = self::STATUS_OPEN;
            $this->subtotal = null;
            $this->discount_total = null;
            $this->tax_total = null;
            $this->grand_total = null;
        }
    }

    public function touchAggregateVersion(): void
    {
        $this->lock_version++;
        $this->save();
    }

    /**
     * @return HasMany<CheckoutItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(CheckoutItem::class);
    }
}
