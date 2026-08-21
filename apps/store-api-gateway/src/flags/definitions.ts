/**
 * Config-driven flag definitions — "Framework only. No UI yet," per this
 * slice's own scope. A real flag-management admin surface (persistence,
 * an authoring UI) is explicitly future work; this is the seam it will
 * eventually write into (`registerFlag` is the one function that matters
 * — a future persistence-backed loader calls it the same way this static
 * starter set does).
 */
import type { FlagDefinition } from './types.js';

const definitions = new Map<string, FlagDefinition>();

export function registerFlag(definition: FlagDefinition): void {
  definitions.set(definition.key, definition);
}

export function getFlagDefinitions(): Map<string, FlagDefinition> {
  return definitions;
}

// --- Starter set — real flags this Gateway's own future routes will consume ---
registerFlag({
  key: 'recommendations.enabled',
  description: 'Whether the Recommendation API (recommendations/*) serves results at all, per store.',
  scope: 'store',
  defaultValue: true,
});
registerFlag({
  key: 'preview.enabled',
  description: 'Whether Preview Framework routes are reachable in this environment.',
  scope: 'global',
  defaultValue: true,
});
registerFlag({
  key: 'experiment.homepage-layout-v2',
  description: 'Example experiment flag — a future A/B test candidate, per CDP_ARCHITECTURE.md §7.2/LANDING_ENGINE_ARCHITECTURE.md §3.4 split-testing design. Named here to prove the rollout-percentage mechanism end-to-end; not wired to any real behavior yet.',
  scope: 'experiment',
  defaultValue: true,
  rolloutPercentage: 0,
});
