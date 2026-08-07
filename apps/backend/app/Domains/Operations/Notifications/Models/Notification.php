<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Models;

use App\Domains\Operations\Notifications\Exceptions\InvalidNotificationStatusTransitionException;
use App\Domains\Operations\Notifications\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\NotificationFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * MODULE:NOTIFICATIONS' own aggregate root — see the notifications
 * migration's own docblock for the full rationale behind every design
 * choice here (why one aggregate covers every channel, why
 * `related_type`/`related_id` and `recipient` are plain snapshot columns
 * never foreign keys, and the Notification Status Lifecycle this class
 * enforces).
 *
 * @property string $id
 * @property string $tenant_id
 * @property string|null $notification_template_id
 * @property string $channel
 * @property string $recipient
 * @property string|null $subject
 * @property string $body
 * @property string $status
 * @property array<string, mixed>|null $context
 * @property string|null $related_type
 * @property string|null $related_id
 * @property string|null $provider_code
 * @property int $attempts_count
 * @property int $max_attempts
 * @property Carbon|null $next_retry_at
 * @property Carbon|null $last_attempted_at
 * @property Carbon|null $sent_at
 * @property Carbon|null $failed_at
 * @property Carbon|null $cancelled_at
 * @property string|null $failure_reason
 * @property int $lock_version
 */
final class Notification extends Model
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids;

    public const string STATUS_PENDING = 'pending';

    public const string STATUS_QUEUED = 'queued';

    public const string STATUS_SENDING = 'sending';

    public const string STATUS_SENT = 'sent';

    public const string STATUS_FAILED = 'failed';

    public const string STATUS_CANCELLED = 'cancelled';

    /**
     * The Notification Status Lifecycle. `failed` is deliberately NOT a
     * dead end — it may return to `queued` via Actions\
     * RetryNotificationAction (either an operator-triggered retry or
     * Actions\SendNotificationAction's own backoff-driven automatic
     * retry) up until `attempts_count` reaches `max_attempts`, at which
     * point it stays `failed` permanently — mirrors Payments'
     * `STATUS_FAILED => [STATUS_PROCESSING]`-shaped retry re-entry
     * exactly (see Returns' `RefundRequest::TRANSITIONS`).
     *
     * @var array<string, list<string>>
     */
    private const array ALLOWED_TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_QUEUED, self::STATUS_CANCELLED],
        self::STATUS_QUEUED => [self::STATUS_SENDING, self::STATUS_CANCELLED],
        self::STATUS_SENDING => [self::STATUS_SENT, self::STATUS_FAILED],
        self::STATUS_FAILED => [self::STATUS_QUEUED],
        self::STATUS_SENT => [],
        self::STATUS_CANCELLED => [],
    ];

    protected $fillable = [
        'notification_template_id',
        'channel',
        'recipient',
        'subject',
        'body',
        'status',
        'context',
        'related_type',
        'related_id',
        'provider_code',
        'attempts_count',
        'max_attempts',
        'next_retry_at',
        'last_attempted_at',
        'sent_at',
        'failed_at',
        'cancelled_at',
        'failure_reason',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'attempts_count' => 'integer',
            'max_attempts' => 'integer',
            'next_retry_at' => 'datetime',
            'last_attempted_at' => 'datetime',
            'sent_at' => 'datetime',
            'failed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::creating(function (self $notification): void {
            $notification->tenant_id ??= TenantId::DEFAULT;
            $notification->status ??= self::STATUS_PENDING;
            $notification->attempts_count ??= 0;
            $notification->max_attempts ??= 5;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default.
            $notification->lock_version ??= 1;
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return NotificationFactory
     */
    protected static function newFactory(): Factory
    {
        return NotificationFactory::new();
    }

    /**
     * @throws InvalidNotificationStatusTransitionException
     */
    public function assertCanTransitionTo(string $target): void
    {
        if (! in_array($target, self::ALLOWED_TRANSITIONS[$this->status] ?? [], true)) {
            throw new InvalidNotificationStatusTransitionException($this->id, $this->status, $target);
        }
    }

    public function canTransitionTo(string $target): bool
    {
        return in_array($target, self::ALLOWED_TRANSITIONS[$this->status] ?? [], true);
    }

    public function isTerminal(): bool
    {
        return (self::ALLOWED_TRANSITIONS[$this->status] ?? []) === [];
    }

    public function hasExhaustedRetries(): bool
    {
        return $this->attempts_count >= $this->max_attempts;
    }

    /**
     * @return BelongsTo<NotificationTemplate, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(NotificationTemplate::class, 'notification_template_id');
    }

    /**
     * @return HasMany<NotificationDeliveryAttempt, $this>
     */
    public function deliveryAttempts(): HasMany
    {
        return $this->hasMany(NotificationDeliveryAttempt::class)->orderBy('occurred_at');
    }
}
