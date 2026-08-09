import { forwardRef } from 'react';
import * as RadixAvatar from '@radix-ui/react-avatar';
import { cn } from '../../lib/cn.js';

export interface AvatarProps extends RadixAvatar.AvatarProps {
  src?: string;
  alt?: string;
  /** Shown while the image loads or is absent — typically the operator's initials. */
  fallback: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS = { sm: 'size-6 text-caption', md: 'size-8 text-body', lg: 'size-10 text-body-strong' };

/** DESIGN_SYSTEM.md §2 — Avatar. */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { className, src, alt, fallback, size = 'md', ...props },
  ref,
) {
  return (
    <RadixAvatar.Root
      ref={ref}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-brand text-white',
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    >
      {src && <RadixAvatar.Image src={src} alt={alt ?? ''} className="size-full object-cover" />}
      <RadixAvatar.Fallback className="font-medium uppercase" delayMs={src ? 400 : 0}>
        {fallback}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
});
