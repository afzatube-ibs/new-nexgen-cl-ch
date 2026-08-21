/**
 * Feature Flag Framework — this slice's own required scope: "Global,
 * Store, Theme, Preview, Experiment flags... rollout percentages...
 * environment-specific... No UI yet. Framework only."
 *
 * Scope precedence, most-specific wins (a Preview or Experiment override
 * always beats a Store default, which always beats a Global default) —
 * the same "narrow, explicit override, never ambient surprise" discipline
 * `THEME_ENGINE_ARCHITECTURE.md` §9 already applies to child-theme
 * overrides, applied here to flags.
 */

export type FlagScope = 'global' | 'store' | 'theme' | 'preview' | 'experiment';

export interface FlagEvaluationContext {
  environment: 'development' | 'test' | 'production';
  storeId?: string;
  themeId?: string;
  /** Present only inside an active preview session (preview/token.ts) — lets a flag be forced on/off for a previewer without affecting real traffic. */
  previewSessionId?: string;
  /** A stable per-visitor bucketing key (the guest deviceId, per CDP_ARCHITECTURE.md §3.1) — required for any flag using `rolloutPercentage`, so the same visitor always lands in the same bucket. */
  bucketingKey?: string;
}

export interface FlagDefinition {
  key: string;
  description: string;
  scope: FlagScope;
  /** The value returned when nothing more specific overrides it. */
  defaultValue: boolean;
  /** 0-100. Only consulted when defaultValue's own scope-resolution would otherwise return true and no explicit override exists — a rollout narrows exposure, it does not itself turn a flag on. */
  rolloutPercentage?: number;
  /** Per-store/per-theme/per-environment explicit overrides — the actual override table this framework evaluates against. */
  overrides?: {
    stores?: Record<string, boolean>;
    themes?: Record<string, boolean>;
    environments?: Partial<Record<FlagEvaluationContext['environment'], boolean>>;
  };
}

export interface FlagEvaluationResult {
  key: string;
  value: boolean;
  /** Which rule actually decided the value — real observability into "why is this flag on/off for this request," not a black box. */
  reason: 'preview_override' | 'store_override' | 'theme_override' | 'environment_override' | 'rollout_bucket' | 'default' | 'unknown_flag';
}
