import { nexgenPreset } from '@nexgen/tokens/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [nexgenPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};
