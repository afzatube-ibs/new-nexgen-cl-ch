// Standalone flat config, not @nexgen/config/eslint — that base is React-shaped
// (react/react-hooks/jsx-a11y plugins, DOM lib) per ADR-0005/0006's own
// frontends; this is a pure Node.js service with no UI, same reasoning as
// tsconfig.json's own choice not to extend the shared base.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    },
  },
  prettierConfig,
  {
    // Fastify's `.inject()` response `.json()` is untyped (`any`) by
    // design — asserting against it is exactly what an integration test
    // does. Relaxing the type-safety rules here, not in src/, matches
    // this project's own established pattern (apps/admin's own Playwright
    // specs carry the identical exception for the same reason).
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // A Vitest mock's own method (e.g. `expect(backend.post).not.toHaveBeenCalled()`)
      // is a real, correct pattern this rule cannot distinguish from a
      // genuinely unsafe detached method reference — same "relax in
      // test/, never in src/" reasoning as the three rules above.
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // Real, pre-existing gap found live running `eslint .` (not `eslint
    // src test`, this package's own documented narrower convention) —
    // tsconfig.json's own `include` was always `src/**/*.ts`+`test/**/*.ts`
    // only (by design, per that file's own docblock), so the type-aware
    // parser had no project reference for either root-level config file
    // and failed to parse them at all. Excluded here rather than pulled
    // into the typed project, matching how `dist/**`/`node_modules/**`
    // are already excluded for the same reason: neither is application
    // source code this package's own strictness bar governs.
    ignores: ['dist/**', 'node_modules/**', 'eslint.config.js', 'vitest.config.ts'],
  },
);
