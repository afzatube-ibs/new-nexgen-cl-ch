import { Sparkles } from 'lucide-react';
import { Button, Tooltip, TooltipTrigger, TooltipContent } from '@nexgen/ui';

export interface AiReserveButtonProps {
  label: string;
}

/**
 * A reserved, elegant location for a future AI action — never a fake
 * implementation. Disabled, with a tooltip naming exactly what it will do
 * once built. Mirrors `apps/admin/src/extension-points/index.ts`'s own
 * "type-only, zero runtime behavior" discipline from Phase 2.1, expressed
 * here as a UI affordance rather than a TypeScript interface: a stub that
 * silently "did something" would be the fake implementation the project's
 * own quality bar forbids; a clearly-disabled button that says exactly
 * what's coming is honest about the gap instead of hiding it.
 */
export function AiReserveButton({ label }: AiReserveButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button type="button" variant="ghost" size="sm" disabled className="text-brand disabled:opacity-40">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>AI-assisted {label.toLowerCase()} is planned for a future phase — not built yet.</TooltipContent>
    </Tooltip>
  );
}
