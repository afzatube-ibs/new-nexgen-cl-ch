import { baseConfig } from '@nexgen/config/eslint';

export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
  {
    // Node-context build config files (next.config.mjs, tailwind.config.js,
    // postcss.config.js) run under Node, not the browser — `process` is a
    // real Node global there, not an undefined reference; `no-undef` has no
    // way to know that without this explicit `globals` entry.
    files: ['*.config.mjs', '*.config.js'],
    languageOptions: { globals: { process: 'readonly' } },
  },
];
