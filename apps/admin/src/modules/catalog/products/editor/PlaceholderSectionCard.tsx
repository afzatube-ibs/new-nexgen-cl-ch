import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent, EmptyState } from '@nexgen/ui';

export interface PlaceholderSectionCardProps {
  title: string;
  icon: ReactNode;
  description: string;
}

/**
 * The information architecture the Product Editor is organized around
 * (Identity/Media/Pricing/Inventory/Organization/Description/SEO/Advanced —
 * this phase's own brief) includes four sections the backend doesn't
 * support yet (Media attachment, Pricing, Inventory, Organization —
 * category/collection/tag/option assignment; all Slice 2). Rather than
 * omit them (losing the correct mental model) or fake them with dead
 * inputs (violating this project's own "no fake placeholder UI" rule,
 * established in Phase 2.1/2.2), each renders as a real, honest
 * `EmptyState` naming exactly what's missing and why — the same discipline
 * the empty Dashboard/Settings frameworks already established.
 */
export function PlaceholderSectionCard({ title, icon, description }: PlaceholderSectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState icon={icon} title="Not available yet" description={description} />
      </CardContent>
    </Card>
  );
}
