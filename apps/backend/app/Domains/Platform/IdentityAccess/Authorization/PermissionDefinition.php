<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Authorization;

/**
 * One entry in a PermissionRegistry — see PermissionRegistry's docblock.
 */
final readonly class PermissionDefinition
{
    public function __construct(
        public string $key,
        public string $label,
        public string $module,
    ) {}
}
