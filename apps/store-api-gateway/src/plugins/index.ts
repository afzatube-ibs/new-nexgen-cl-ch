/**
 * Gateway Plugin Architecture — this slice's own explicit requirement:
 * "Refactor for long-term growth. Create plugin boundaries for: Tracking,
 * Personalization, Preview, Experiments, Recommendations, Caching, Future
 * AI, Future Marketplace." This file is the manifest — not code every
 * plugin imports, but the single place a future contributor (or this
 * project's own future AI/Marketplace phases) reads to understand what
 * exists, what it owns, and what it may never touch.
 *
 * No plugin listed here reaches into another plugin's own decorated state
 * except through that plugin's own public decoration (`app.events`,
 * `app.flags`, etc.) — the same "one governing extension mechanism, no
 * fourth invented one" discipline `MARKETPLACE_PLATFORM_ARCHITECTURE.md`
 * §1 already established for the platform as a whole, applied here at
 * Gateway-process granularity.
 */

export interface PluginBoundary {
  name: string;
  file: string;
  owns: string[];
  dependsOn: string[];
  requiredBy: 'Tracking' | 'Personalization' | 'Preview' | 'Experiments' | 'Recommendations' | 'Caching' | 'Security' | 'Core';
}

export const PLUGIN_BOUNDARIES: PluginBoundary[] = [
  { name: 'tracing', file: 'plugins/tracing.ts', owns: ['request.traceId', 'request.traceStartedAt', 'X-Trace-Id header'], dependsOn: [], requiredBy: 'Tracking' },
  { name: 'security', file: 'plugins/security.ts', owns: ['rate limiting', 'CORS', 'security headers'], dependsOn: [], requiredBy: 'Security' },
  { name: 'context (guest session)', file: 'plugins/context.ts', owns: ['request.guestIdentity', 'nx_did cookie'], dependsOn: [], requiredBy: 'Core' },
  { name: 'personalization', file: 'plugins/personalization.ts', owns: ['request.personalization'], dependsOn: ['context (guest session)'], requiredBy: 'Personalization' },
  { name: 'flags', file: 'plugins/flags.ts', owns: ['app.flags (FlagEvaluator)'], dependsOn: [], requiredBy: 'Experiments' },
  { name: 'preview', file: 'plugins/preview.ts', owns: ['app.preview (mint/verify)'], dependsOn: [], requiredBy: 'Preview' },
  { name: 'events', file: 'plugins/events.ts', owns: ['app.events (EventPipeline)', 'app.eventQueue', 'app.destinations'], dependsOn: [], requiredBy: 'Tracking' },
  { name: 'recommendations', file: 'plugins/recommendations.ts', owns: ['app.recommendations (RecommendationEngineRegistry)'], dependsOn: ['backend/client.ts (BackendClient)'], requiredBy: 'Recommendations' },
  { name: 'openapi', file: 'plugins/openapi.ts', owns: ['/docs', '/docs/json'], dependsOn: [], requiredBy: 'Core' },
];

/**
 * Named, not built (this slice's own "future AI, future Marketplace"
 * requirement) — the two boundaries a future phase attaches under,
 * consistent with `NEXTGEN_PLATFORM_MASTER_ROADMAP.md` §7's own AI
 * roadmap ("attaches through the Extension System... additive, never
 * load-bearing") and §8's Marketplace roadmap. Neither requires a new
 * mechanism beyond what already exists above:
 *
 *   - **Future AI**: a consumer of `app.events` (behavioral signal) and
 *     `app.recommendations` (a new `RecommendationEngineContract`
 *     implementation registered ahead of the fallback) — no new plugin
 *     category required, only new registrations against contracts that
 *     already exist.
 *   - **Future Marketplace**: a consumer of `app.destinations` (a
 *     third-party app IS a `DestinationContract` implementation, or a
 *     Custom Webhook — `CDP_ARCHITECTURE.md` §5.4) and `app.flags` (an
 *     installed app may register its own experiment/rollout flags through
 *     the same `registerFlag` seam `flags/definitions.ts` already uses).
 */
