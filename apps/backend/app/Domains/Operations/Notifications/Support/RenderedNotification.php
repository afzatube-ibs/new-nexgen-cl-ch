<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Support;

/**
 * The result of Support\TemplateRenderer::render() — a template's subject
 * and body with every `{{merge_field}}` placeholder resolved.
 */
final readonly class RenderedNotification
{
    public function __construct(
        public ?string $subject,
        public string $body,
    ) {}
}
