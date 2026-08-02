<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Authorization;

/**
 * One entry in PermissionRegistry — its own value object per module, for
 * the reasons Identity & Access's PermissionRegistry docblock states.
 */
final readonly class PermissionDefinition
{
    public function __construct(
        public string $key,
        public string $label,
        public string $module,
    ) {}
}
