import { nexgenPreset } from '@nexgen/tokens/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [nexgenPreset],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/storefront-engine/src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};
