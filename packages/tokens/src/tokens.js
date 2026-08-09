// @nexgen/tokens — canonical values, per docs/frontend/DESIGN_SYSTEM.md §1.
//
// This is the ONE place these values are written. `index.ts` re-exports it
// typed; `tailwind-preset.js` shapes it for Tailwind's `theme.extend`; any
// runtime code (e.g. packages/ui's Chart wrapper) imports `tokens` directly.
// A component NEVER references a primitive shade (`slate.600`) — only the
// semantic name (`colors.light.text.secondary`) — per §1.1's own rule that
// this indirection is what makes a rebrand or theme override a one-file
// change, never a per-component audit.

// Primitive scale — Tailwind's own default palette hex values (v3),
// per §1.1: "not redefined from scratch... already satisfy UI:COLOR_SYSTEM's
// implicit accessibility-contrast expectations at the steps used here."
// `slate.850` is the one deliberate addition: DESIGN_SYSTEM.md §1.1 calls
// for it (dialog/drawer/popover overlay surface in dark mode) and it does
// not exist in Tailwind's default scale — interpolated between the
// official 800 (#1e293b) and 900 (#0f172a) steps.
const primitive = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    850: '#172033',
    900: '#0f172a',
    950: '#020617',
  },
  indigo: {
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
  },
  emerald: { 400: '#34d399', 600: '#059669' },
  amber: { 400: '#fbbf24', 600: '#d97706' },
  red: { 400: '#f87171', 600: '#dc2626' },
  sky: { 400: '#38bdf8', 600: '#0284c7' },
  white: '#ffffff',
};

/** Semantic color tokens — §1.1. */
const colors = {
  light: {
    surface: { default: primitive.white, subtle: primitive.slate[50], overlay: primitive.white },
    border: { default: primitive.slate[200] },
    text: {
      primary: primitive.slate[900],
      secondary: primitive.slate[500],
      disabled: primitive.slate[300],
    },
    brand: {
      default: primitive.indigo[600],
      hover: primitive.indigo[700],
      active: primitive.indigo[800],
    },
    feedback: {
      success: primitive.emerald[600],
      warning: primitive.amber[600],
      danger: primitive.red[600],
      info: primitive.sky[600],
    },
    focus: { ring: primitive.indigo[500] },
  },
  dark: {
    surface: {
      default: primitive.slate[900],
      subtle: primitive.slate[800],
      overlay: primitive.slate[850],
    },
    border: { default: primitive.slate[700] },
    text: {
      primary: primitive.slate[50],
      secondary: primitive.slate[400],
      disabled: primitive.slate[600],
    },
    brand: {
      default: primitive.indigo[500],
      hover: primitive.indigo[400],
      active: primitive.indigo[300],
    },
    feedback: {
      success: primitive.emerald[400],
      warning: primitive.amber[400],
      danger: primitive.red[400],
      info: primitive.sky[400],
    },
    focus: { ring: primitive.indigo[500] },
  },
};

/** Typography tokens — §1.2. Sizes/line-heights in px (Tailwind consumes as rem via preset). */
const typography = {
  fontFamily: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  },
  textStyles: {
    display: { fontSize: 36, lineHeight: 44, fontWeight: 600 },
    heading: { fontSize: 24, lineHeight: 32, fontWeight: 600 },
    subheading: { fontSize: 18, lineHeight: 28, fontWeight: 600 },
    body: { fontSize: 14, lineHeight: 20, fontWeight: 400 },
    'body-strong': { fontSize: 14, lineHeight: 20, fontWeight: 600 },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: 400 },
    code: { fontSize: 13, lineHeight: 20, fontWeight: 400 },
  },
};

/**
 * Elevation tokens — §1.4. Dark mode intentionally does not scale shadow
 * opacity to zero; it pairs a subtler/cooler shadow with a 1px
 * `color.border.default` outline (applied by the component, since it needs
 * the current theme's border color, not encoded in the shadow string here).
 */
const elevation = {
  light: {
    0: 'none',
    1: '0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 3px 0 rgb(15 23 42 / 0.10)',
    2: '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.08)',
    3: '0 10px 15px -3px rgb(15 23 42 / 0.10), 0 4px 6px -4px rgb(15 23 42 / 0.10)',
    4: '0 20px 25px -5px rgb(15 23 42 / 0.12), 0 8px 10px -6px rgb(15 23 42 / 0.10)',
  },
  dark: {
    0: 'none',
    1: '0 1px 2px 0 rgb(2 6 23 / 0.40)',
    2: '0 4px 6px -1px rgb(2 6 23 / 0.45)',
    3: '0 10px 15px -3px rgb(2 6 23 / 0.50)',
    4: '0 20px 25px -5px rgb(2 6 23 / 0.55)',
  },
};

/** Border radius tokens — §1.5. */
const radius = { sm: '4px', md: '6px', lg: '8px', full: '9999px' };

/** Motion tokens — §1.7. */
const motion = {
  duration: { fast: '100ms', default: '200ms', slow: '300ms' },
  easing: { default: 'cubic-bezier(0.4, 0, 0.2, 1)' },
};

/**
 * Breakpoints — §1.6. Documented here for runtime (JS media-query) use;
 * Tailwind's own default scale is left unmodified in the preset, per §1.6's
 * "Tailwind's own default breakpoint scale, unmodified."
 */
const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

export const tokens = { primitive, colors, typography, elevation, radius, motion, breakpoints };
