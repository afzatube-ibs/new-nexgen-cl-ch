import { forwardRef } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

export type IconSize = 'inline' | 'standalone';

const SIZE_PX: Record<IconSize, number> = { inline: 16, standalone: 20 };

export interface IconProps extends Omit<LucideProps, 'size' | 'ref'> {
  icon: LucideIcon;
  /** DESIGN_SYSTEM.md §4: 16px inline/inside-control, 20px standalone/navigation. */
  size?: IconSize;
}

/** Thin Lucide re-export fixing size/stroke-width to the design system's two standard sizes — per docs/frontend/DESIGN_SYSTEM.md §4. */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { icon: LucideIconComponent, size = 'standalone', strokeWidth = 2, ...props },
  ref,
) {
  return <LucideIconComponent ref={ref} size={SIZE_PX[size]} strokeWidth={strokeWidth} aria-hidden="true" {...props} />;
});
