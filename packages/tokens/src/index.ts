import { tokens } from './tokens.js';

export type ThemeMode = 'light' | 'dark';

export type ColorTokens = typeof tokens.colors.light;
export type TypographyTokens = typeof tokens.typography;
export type ElevationTokens = typeof tokens.elevation.light;
export type RadiusTokens = typeof tokens.radius;
export type MotionTokens = typeof tokens.motion;
export type BreakpointTokens = typeof tokens.breakpoints;

/** Resolve the semantic color set for a given theme mode. Never index a primitive shade directly. */
export function getColorTokens(mode: ThemeMode): ColorTokens {
  return tokens.colors[mode];
}

/** Resolve the elevation shadow set for a given theme mode — see tokens.js's dark-mode elevation note. */
export function getElevationTokens(mode: ThemeMode): ElevationTokens {
  return tokens.elevation[mode];
}

export { tokens };
export default tokens;
