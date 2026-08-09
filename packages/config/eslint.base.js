// @nexgen/config — shared ESLint flat config (ESLint 9+), per ADR-0009's
// "shared ESLint/TypeScript/Tailwind base configuration" package. Every
// apps/* workspace imports and extends this array rather than redefining
// its own rule set — the same "one clear responsibility, consumed not
// duplicated" reasoning ADR-0009 applies to every package under packages/.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import boundaries from 'eslint-plugin-boundaries';
import prettierConfig from 'eslint-config-prettier';

/**
 * The ADR-0009 package boundary rule, enforced as a lint failure rather
 * than a documented-but-unenforced convention: an `apps/*` app may depend
 * on `packages/*`, never on another `apps/*` app directly; a `packages/*`
 * package may depend on another `packages/*` package, never on `apps/*`.
 */
const boundariesElements = [
  { type: 'app', pattern: 'apps/*/src/**/*', partialMatch: false, capture: ['app'] },
  { type: 'package', pattern: 'packages/*/src/**/*', partialMatch: false, capture: ['package'] },
];

export const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      boundaries,
    },
    settings: {
      react: { version: 'detect' },
      'boundaries/elements': boundariesElements,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // ADR-0009: apps/* may only depend on packages/*, never on another
      // apps/* directly; packages/* may depend on packages/* only.
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'app', allow: ['package'] },
            { from: 'package', allow: ['package'] },
          ],
        },
      ],

      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      'react/prop-types': 'off', // TypeScript is the source of truth for prop shapes
      // Not part of eslint-plugin-react's "recommended" preset, opted in
      // deliberately: an array-index key silently breaks state/DOM
      // reconciliation the moment a list is ever reordered, filtered, or
      // has an item removed. The rare, genuine "this list item has no
      // stable identity of its own" exception (a loading Skeleton row, a
      // pagination ellipsis marker) still requires its own explicit,
      // justified disable comment at the call site — never a silent one.
      'react/no-array-index-key': 'warn',
    },
  },
  prettierConfig,
);

export default baseConfig;
