<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\EventBus;

/**
 * A single well-known tenant identifier for the current, single-tenant
 * installation.
 *
 * Per ARCH:DATA_OWNERSHIP, every domain's owned data — and, by extension,
 * every domain event — is designed from Phase 1 onward with an implicit
 * installation/tenant boundary, enforced but not exercised until real
 * multi-tenancy is built. This class is the entire scope of that design-in:
 * one constant, carried on every DomainEvent, so a future tenant boundary
 * narrows an already-present field instead of retrofitting one onto every
 * event ever published. It is deliberately not a tenancy subsystem.
 */
final class TenantId
{
    public const string DEFAULT = 'default';

    private function __construct() {}
}
