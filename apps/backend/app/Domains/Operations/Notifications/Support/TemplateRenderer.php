<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Support;

use App\Domains\Operations\Notifications\Models\NotificationTemplate;

/**
 * Resolves a NotificationTemplate's `{{merge_field}}` placeholders against
 * caller-supplied merge data — see the notification_templates migration's
 * own docblock for why this is a deliberately simple mechanism (no
 * template engine dependency). A placeholder with no matching key in the
 * merge data is left in the output verbatim rather than silently
 * collapsing to an empty string, per PRINCIPLES:EXPLICIT_FAILURE — a
 * missing merge field is an authoring mistake that should be visible, not
 * hidden.
 */
final readonly class TemplateRenderer
{
    /**
     * @param  array<string, scalar|null>  $mergeData
     */
    public function render(NotificationTemplate $template, array $mergeData): RenderedNotification
    {
        return new RenderedNotification(
            subject: $template->subject !== null ? $this->replace($template->subject, $mergeData) : null,
            body: $this->replace($template->body, $mergeData),
        );
    }

    /**
     * @param  array<string, scalar|null>  $mergeData
     */
    private function replace(string $content, array $mergeData): string
    {
        foreach ($mergeData as $key => $value) {
            $content = str_replace('{{'.$key.'}}', (string) $value, $content);
        }

        return $content;
    }
}
