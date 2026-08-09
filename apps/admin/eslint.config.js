import { baseConfig } from '@nexgen/config/eslint';

export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ['dist/**', 'playwright-report/**', 'test-results/**'],
  },
];
