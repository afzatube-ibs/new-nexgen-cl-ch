import type { ReactNode } from 'react';
import { Text } from '@nexgen/ui';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Shared Framework — every module screen (list, detail, settings panel) opens with this, never a hand-rolled heading block. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Text as="h1" variant="heading">
          {title}
        </Text>
        {description && (
          <Text variant="body" className="mt-1 text-text-secondary">
            {description}
          </Text>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
