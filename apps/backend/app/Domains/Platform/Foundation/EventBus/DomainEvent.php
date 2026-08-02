<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\EventBus;

use DateTimeImmutable;
use Illuminate\Support\Facades\Context;
use Ramsey\Uuid\Uuid;

/**
 * The envelope every domain event travelling on the platform's internal
 * event bus extends, per ARCH:CROSS_DOMAIN_COMMUNICATION.
 *
 * DomainEvent carries only transport metadata (identity, timing,
 * correlation, tenant). It never carries a data classification of its own —
 * SECURITY:EVENT_SECURITY places that responsibility on each publishing
 * module: a subclass exposes exactly the fields its owning module has
 * decided belong in its public contract, and nothing this base class adds
 * can leak beyond what the subclass author already intended.
 */
abstract class DomainEvent
{
    /**
     * DATA:ENTITY_IDENTITY applied to events: a stable identity assigned
     * once, never reused, and never encoding business meaning.
     */
    public readonly string $eventId;

    public readonly DateTimeImmutable $occurredAt;

    /**
     * API:CORRELATION made real for the event bus: ties this event back to
     * whatever request or job caused it. Falls back to the ambient
     * correlation identifier set by AssignCorrelationId middleware
     * (propagated via Laravel's Context, which also reaches log output)
     * when the publisher does not supply one explicitly.
     */
    public readonly ?string $correlationId;

    /**
     * ARCH:DATA_OWNERSHIP's tenant boundary, designed in and unexercised —
     * see TenantId's docblock.
     */
    public readonly string $tenantId;

    public function __construct(?string $correlationId = null, ?string $tenantId = null)
    {
        $this->eventId = Uuid::uuid7()->toString();
        $this->occurredAt = new DateTimeImmutable;
        $this->correlationId = $correlationId ?? self::ambientCorrelationId();
        $this->tenantId = $tenantId ?? TenantId::DEFAULT;
    }

    /**
     * The stable, versioned event name published to subscribers — part of
     * the publishing module's public contract (MODULE:PUBLIC_CONTRACT), so
     * it must not be inferred from the PHP class name, which is free to
     * change as an internal-implementation detail.
     */
    abstract public function name(): string;

    private static function ambientCorrelationId(): ?string
    {
        $value = Context::get('correlation_id');

        return is_string($value) ? $value : null;
    }
}
