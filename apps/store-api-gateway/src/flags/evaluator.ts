/**
 * Deterministic flag evaluation — precedence, high to low:
 *   1. Preview override (a previewer forcing a flag for their own session only)
 *   2. Store override
 *   3. Theme override
 *   4. Environment override
 *   5. Rollout percentage (deterministic per bucketingKey, never random per request)
 *   6. defaultValue
 *
 * "Deterministic per bucketingKey" matters: the same visitor must see the
 * same flag state on every request, or a rollout becomes a flicker instead
 * of a real, stable experiment/rollout — computed via a stable hash, never
 * `Math.random()`.
 */
import { createHash } from 'node:crypto';
import type { FlagDefinition, FlagEvaluationContext, FlagEvaluationResult } from './types.js';

function bucketOf(key: string, bucketingKey: string): number {
  const hash = createHash('sha256').update(`${key}:${bucketingKey}`).digest();
  // First 4 bytes as an unsigned int, modulo 100 — uniform enough for a
  // rollout bucketer's actual need (not cryptographic, just stable).
  const value = hash.readUInt32BE(0);
  return value % 100;
}

export function evaluateFlag(definition: FlagDefinition, context: FlagEvaluationContext): FlagEvaluationResult {
  if (context.previewSessionId && definition.scope === 'preview') {
    return { key: definition.key, value: true, reason: 'preview_override' };
  }

  if (context.storeId && definition.overrides?.stores?.[context.storeId] !== undefined) {
    return { key: definition.key, value: definition.overrides.stores[context.storeId]!, reason: 'store_override' };
  }

  if (context.themeId && definition.overrides?.themes?.[context.themeId] !== undefined) {
    return { key: definition.key, value: definition.overrides.themes[context.themeId]!, reason: 'theme_override' };
  }

  const envOverride = definition.overrides?.environments?.[context.environment];
  if (envOverride !== undefined) {
    return { key: definition.key, value: envOverride, reason: 'environment_override' };
  }

  if (definition.defaultValue && definition.rolloutPercentage !== undefined && definition.rolloutPercentage < 100) {
    if (!context.bucketingKey) {
      // No stable identity to bucket by (should not happen once Guest
      // Session — Slice 1 — always resolves one; defensive fallback) —
      // fail closed to the flag's own default rather than guessing.
      return { key: definition.key, value: definition.defaultValue, reason: 'default' };
    }
    const inRollout = bucketOf(definition.key, context.bucketingKey) < definition.rolloutPercentage;
    return { key: definition.key, value: inRollout, reason: 'rollout_bucket' };
  }

  return { key: definition.key, value: definition.defaultValue, reason: 'default' };
}

export class FlagEvaluator {
  constructor(private readonly definitions: Map<string, FlagDefinition>) {}

  evaluate(key: string, context: FlagEvaluationContext): FlagEvaluationResult {
    const definition = this.definitions.get(key);
    if (!definition) {
      return { key, value: false, reason: 'unknown_flag' };
    }
    return evaluateFlag(definition, context);
  }

  evaluateAll(context: FlagEvaluationContext): FlagEvaluationResult[] {
    return [...this.definitions.values()].map((definition) => evaluateFlag(definition, context));
  }
}
