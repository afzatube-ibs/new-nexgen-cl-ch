import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * A plain `twMerge` mis-resolves this platform's own custom `fontSize`
 * scale (`text-display`/`heading`/`section`/`subheading`/`stat`/`body`/
 * `body-strong`/`label`/`caption`/`code`, from @nexgen/tokens'
 * `tailwind-preset.js`) — tailwind-merge's default heuristic doesn't
 * recognize these as Tailwind's built-in `font-size` keyword scale
 * (`xs`/`sm`/`base`/...), so it silently classifies them into the
 * `text-color` conflict group instead. Every component that combines a
 * `text-{style}` sizing class with a real `text-{color}` class (e.g.
 * `Button`'s `text-white` + its own `text-body` size class) then has its
 * COLOR silently dropped, keeping only whichever class happened to come
 * later in the merged string — found live via this repo's own Playwright
 * accessibility pass (an axe-core "insufficient color contrast" violation
 * on the Login page's submit button, which should have rendered white text
 * on an indigo background but rendered with no explicit color at all,
 * inheriting `text.primary`/near-black instead). Registering these names
 * under `font-size` explicitly is the real fix — not a lint-suppression,
 * not a per-component class-order workaround that would silently regress
 * the moment someone reorders `cva()`'s variant keys.
 *
 * The Design Foundation Refresh (`planning/reviews/
 * PHASE_2X_DESIGN_FOUNDATION_REFRESH_REPORT.md`) added three new scale
 * names (`section`, `stat`, `label`) to `@nexgen/tokens` without adding
 * them here — reproducing the exact same class of bug this list was
 * originally written to prevent (a real, live "New price list"/"Add
 * price"/pagination-button contrast regression, caught by this repo's own
 * `@axe-core/playwright` scans during that refresh's own quality gates).
 * Every name in `tokens.typography.textStyles` must be listed here — this
 * list is not test-only, and there's no compile-time check that keeps it
 * in sync with the token file, so treat any *new* text style name as
 * incomplete until it's added to both places.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'heading', 'section', 'subheading', 'stat', 'body', 'body-strong', 'label', 'caption', 'code'] },
      ],
    },
  },
});

/** Merges conditional class names, then resolves conflicting Tailwind utility classes (last one wins) — the standard cva/shadcn-style pattern. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
