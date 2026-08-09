import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn, Tooltip, TooltipTrigger, TooltipContent } from '@nexgen/ui';
import type { ModuleNavItem } from '../registry/types.js';

interface SidebarNavProps {
  items: ModuleNavItem[];
  /** Icon-only rail mode (ADMIN_SHELL_ARCHITECTURE.md §4's `md`–`lg` collapsed state, or the manual collapse toggle). */
  railOnly?: boolean;
  onNavigate?: () => void;
}

/** The Sidebar's nav list — shared between the full desktop `<aside>` and the off-canvas mobile Drawer, per ADMIN_SHELL_ARCHITECTURE.md §4. */
export function SidebarNav({ items, railOnly = false, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1 px-2">
      {items.map((item) => (
        <SidebarNavItem key={item.id} item={item} railOnly={railOnly} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function SidebarNavItem({ item, railOnly, onNavigate }: { item: ModuleNavItem; railOnly: boolean; onNavigate?: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const Icon = item.icon;

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-body-strong transition-colors duration-fast',
      'hover:bg-surface-subtle',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
      isActive ? 'bg-surface-subtle text-brand' : 'text-text-primary',
      railOnly && 'justify-center px-0',
    );

  const content = item.path ? (
    <NavLink to={item.path} end={item.path === '/'} className={linkClasses} onClick={onNavigate}>
      {Icon && <Icon className="size-5 shrink-0" />}
      {!railOnly && <span className="truncate">{item.label}</span>}
    </NavLink>
  ) : (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-body-strong text-text-primary hover:bg-surface-subtle',
        railOnly && 'justify-center px-0',
      )}
      aria-expanded={expanded}
    >
      {Icon && <Icon className="size-5 shrink-0" />}
      {!railOnly && (
        <>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {hasChildren && (
            <ChevronDown className={cn('size-4 shrink-0 transition-transform duration-fast', expanded && 'rotate-180')} />
          )}
        </>
      )}
    </button>
  );

  const wrapped = railOnly ? (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  ) : (
    content
  );

  return (
    <div>
      {wrapped}
      {hasChildren && !railOnly && expanded && (
        <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
          {item.children!.map((child) => (
            <SidebarNavItem key={child.id} item={child} railOnly={false} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}
