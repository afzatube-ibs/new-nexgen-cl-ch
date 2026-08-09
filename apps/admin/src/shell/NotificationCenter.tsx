import { Bell } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@nexgen/ui';

/**
 * ADMIN_SHELL_ARCHITECTURE.md §3 / §9: placeholder trigger with an
 * unread-count badge slot — wired to nothing yet. The real panel UI
 * (backed by the Notifications module's `GET /api/v1/notifications`) is
 * explicitly out of this shell's own scope; this component's contract
 * (an icon button with a badge) is what a future real implementation
 * plugs into without a layout change.
 */
export function NotificationCenter() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled
          aria-label="Notifications — coming soon"
          className="relative flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Bell className="size-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Notifications — coming soon</TooltipContent>
    </Tooltip>
  );
}
