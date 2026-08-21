import { describe, expect, it } from 'vitest';
import { evaluateFlag, FlagEvaluator } from '../../../src/flags/evaluator.js';
import type { FlagDefinition } from '../../../src/flags/types.js';

describe('flags/evaluator', () => {
  it('falls back to defaultValue when no override applies', () => {
    const definition: FlagDefinition = { key: 'x', description: '', scope: 'global', defaultValue: true };
    const result = evaluateFlag(definition, { environment: 'production' });
    expect(result).toEqual({ key: 'x', value: true, reason: 'default' });
  });

  it('a store override wins over the default', () => {
    const definition: FlagDefinition = { key: 'x', description: '', scope: 'store', defaultValue: false, overrides: { stores: { 'store-1': true } } };
    expect(evaluateFlag(definition, { environment: 'production', storeId: 'store-1' }).value).toBe(true);
    expect(evaluateFlag(definition, { environment: 'production', storeId: 'store-2' }).value).toBe(false);
  });

  it('a theme override wins over a store override is NOT the case — store precedes theme in this framework\'s own stated precedence', () => {
    const definition: FlagDefinition = {
      key: 'x',
      description: '',
      scope: 'theme',
      defaultValue: false,
      overrides: { stores: { 's1': true }, themes: { 't1': false } },
    };
    // store override (true) is checked before theme override (false) — store wins per types.ts's own documented precedence
    expect(evaluateFlag(definition, { environment: 'production', storeId: 's1', themeId: 't1' }).value).toBe(true);
  });

  it('a preview session forces a preview-scoped flag on', () => {
    const definition: FlagDefinition = { key: 'x', description: '', scope: 'preview', defaultValue: false };
    const result = evaluateFlag(definition, { environment: 'production', previewSessionId: 'preview-1' });
    expect(result).toEqual({ key: 'x', value: true, reason: 'preview_override' });
  });

  it('an environment override applies when present', () => {
    const definition: FlagDefinition = { key: 'x', description: '', scope: 'global', defaultValue: true, overrides: { environments: { development: false } } };
    expect(evaluateFlag(definition, { environment: 'development' }).value).toBe(false);
    expect(evaluateFlag(definition, { environment: 'production' }).value).toBe(true);
  });

  it('rollout percentage is deterministic for the same bucketingKey — same visitor, same result every time', () => {
    const definition: FlagDefinition = { key: 'experiment.x', description: '', scope: 'experiment', defaultValue: true, rolloutPercentage: 50 };
    const first = evaluateFlag(definition, { environment: 'production', bucketingKey: 'visitor-abc' });
    const second = evaluateFlag(definition, { environment: 'production', bucketingKey: 'visitor-abc' });
    expect(first).toEqual(second);
  });

  it('rollout 0% never enables the flag, rollout 100% always enables it', () => {
    const off: FlagDefinition = { key: 'x', description: '', scope: 'experiment', defaultValue: true, rolloutPercentage: 0 };
    const on: FlagDefinition = { key: 'y', description: '', scope: 'experiment', defaultValue: true, rolloutPercentage: 100 };
    for (const key of ['a', 'b', 'c', 'd', 'e']) {
      expect(evaluateFlag(off, { environment: 'production', bucketingKey: key }).value).toBe(false);
      // 100% rollout: defaultValue's own falsy/truthy still gates it (rollout narrows exposure, never turns a false default on)
      expect(evaluateFlag(on, { environment: 'production', bucketingKey: key }).value).toBe(true);
    }
  });

  it('rollout with no bucketingKey fails closed to the default, never guesses', () => {
    const definition: FlagDefinition = { key: 'x', description: '', scope: 'experiment', defaultValue: true, rolloutPercentage: 50 };
    const result = evaluateFlag(definition, { environment: 'production' });
    expect(result).toEqual({ key: 'x', value: true, reason: 'default' });
  });

  it('FlagEvaluator reports unknown_flag for an unregistered key, never throws', () => {
    const evaluator = new FlagEvaluator(new Map());
    const result = evaluator.evaluate('does-not-exist', { environment: 'production' });
    expect(result).toEqual({ key: 'does-not-exist', value: false, reason: 'unknown_flag' });
  });

  it('FlagEvaluator.evaluateAll returns every registered flag', () => {
    const definitions = new Map<string, FlagDefinition>([
      ['a', { key: 'a', description: '', scope: 'global', defaultValue: true }],
      ['b', { key: 'b', description: '', scope: 'global', defaultValue: false }],
    ]);
    const evaluator = new FlagEvaluator(definitions);
    const results = evaluator.evaluateAll({ environment: 'production' });
    expect(results).toHaveLength(2);
  });
});
