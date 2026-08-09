// @nexgen/tokens/tailwind-preset — shapes tokens.js's canonical values into
// a Tailwind CSS preset. Every app's own tailwind.config.js does
// `presets: [nexgenPreset]` rather than hand-copying any value here, per
// docs/frontend/DESIGN_SYSTEM.md §1's "neither app hardcodes a token value
// of its own."
import { tokens } from './src/tokens.js';

/**
 * Flattens { default, hover, active } / { primary, secondary, disabled }
 * style nested token groups into Tailwind color-scale-shaped keys
 * (`DEFAULT`, `hover`, `active`, ...) so `bg-brand`, `bg-brand-hover`,
 * `text-primary` etc. all resolve.
 */
function colorGroup(group) {
  const out = {};
  for (const [key, value] of Object.entries(group)) {
    out[key === 'default' ? 'DEFAULT' : key] = value;
  }
  return out;
}

function semanticColors(mode) {
  const c = tokens.colors[mode];
  return {
    surface: colorGroup(c.surface),
    border: colorGroup(c.border),
    text: colorGroup(c.text),
    brand: colorGroup(c.brand),
    feedback: colorGroup(c.feedback),
    focus: colorGroup(c.focus),
  };
}

// Tailwind cannot key color values off `data-theme` at the config level —
// dark-mode color swapping happens via `dark:` variants at the class level
// (see apps/admin/tailwind.config.js's `darkMode` strategy). Both light and
// dark semantic palettes are still exposed here as e.g. `surface-DEFAULT`
// (light) / a component author adds `dark:bg-surface-dark-DEFAULT`
// explicitly where the two modes diverge, keeping every color trace to a
// named token either way — never a raw hex in component code.
const light = semanticColors('light');
const dark = semanticColors('dark');

/** @type {import('tailwindcss').Config} */
export const nexgenPreset = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: light.surface,
        'surface-dark': dark.surface,
        border: light.border,
        'border-dark': dark.border,
        text: light.text,
        'text-dark': dark.text,
        brand: light.brand,
        'brand-dark': dark.brand,
        feedback: light.feedback,
        'feedback-dark': dark.feedback,
        focus: light.focus,
      },
      fontFamily: tokens.typography.fontFamily,
      fontSize: Object.fromEntries(
        Object.entries(tokens.typography.textStyles).map(([name, style]) => [
          name,
          [`${style.fontSize}px`, { lineHeight: `${style.lineHeight}px`, fontWeight: String(style.fontWeight) }],
        ]),
      ),
      borderRadius: {
        sm: tokens.radius.sm,
        md: tokens.radius.md,
        lg: tokens.radius.lg,
        full: tokens.radius.full,
      },
      boxShadow: {
        'elevation-1': tokens.elevation.light[1],
        'elevation-2': tokens.elevation.light[2],
        'elevation-3': tokens.elevation.light[3],
        'elevation-4': tokens.elevation.light[4],
        'elevation-1-dark': tokens.elevation.dark[1],
        'elevation-2-dark': tokens.elevation.dark[2],
        'elevation-3-dark': tokens.elevation.dark[3],
        'elevation-4-dark': tokens.elevation.dark[4],
      },
      transitionDuration: {
        fast: tokens.motion.duration.fast,
        DEFAULT: tokens.motion.duration.default,
        slow: tokens.motion.duration.slow,
      },
      transitionTimingFunction: {
        DEFAULT: tokens.motion.easing.default,
      },
      // Breakpoints and the base 4px spacing scale (space.0-24, §1.3) are
      // deliberately NOT overridden here — both sections say Tailwind's own
      // defaults already satisfy the requirement, "adopted rather than
      // reinvented."
    },
  },
  plugins: [],
};

export default nexgenPreset;
