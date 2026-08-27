/**
 * Configuration management — the single source of truth for every runtime
 * value this Gateway reads. Every config value is validated once, at boot,
 * so a missing/malformed value fails fast and loudly (PRINCIPLES:EXPLICIT_
 * FAILURE) rather than surfacing as a confusing runtime error deep inside a
 * request handler. Per ENGINEERING:CONFIGURATION_MANAGEMENT, configuration
 * is externalized from code — nothing here is a hardcoded constant that
 * should instead be adjustable per environment.
 */
import { z } from 'zod';

/**
 * `--env-file`/`.env` loaders (this Gateway's own included `.env.example`
 * among them) commonly represent "unset" as an empty string
 * (`EVENTS_WEBHOOK_URL=`), not as an absent key — but Zod's `.optional()`
 * only treats `undefined` as absent, so a merely-empty value fails `.url()`
 * validation instead of being treated as "not configured". Preprocessing
 * blank strings to `undefined` before the real schema runs makes every
 * optional destination-credential field tolerate both conventions.
 */
const emptyStringToUndefined = (value: unknown): unknown => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Category A per STORE_FRONTEND_ARCHITECTURE.md §3.2: a narrowly-scoped
  // service credential, never a customer/staff token, held server-side only.
  BACKEND_BASE_URL: z.string().url(),
  BACKEND_SERVICE_TOKEN: z.string().min(1, 'BACKEND_SERVICE_TOKEN is required — see .env.example'),

  // Beta Sprint 5 — Category B's own real, narrowly-scoped write
  // credential: a distinct Sanctum token for a real, dedicated "Checkout
  // Service Account" (backend), holding only checkout.sessions.view/
  // .manage, shipping.rates.view, payments.payments.manage, and
  // orders.orders.view — never the broader BACKEND_SERVICE_TOKEN's own
  // scope, and never any human staff account's own token. Kept as a
  // second, separate credential (not an upgrade of BACKEND_SERVICE_TOKEN)
  // so a leak of either has a materially different blast radius, per
  // this platform's own SECURITY:DEFENSE_IN_DEPTH.
  BACKEND_CHECKOUT_SERVICE_TOKEN: z.string().min(1, 'BACKEND_CHECKOUT_SERVICE_TOKEN is required — see .env.example'),

  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  REDIS_KEY_PREFIX: z.string().default('nx_gw_cache:'),

  GUEST_SESSION_COOKIE_NAME: z.string().default('nx_did'),
  GUEST_SESSION_SECRET: z.string().min(32, 'GUEST_SESSION_SECRET must be at least 32 characters'),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  DEFAULT_LOCALE: z.string().default('en'),
  SUPPORTED_LOCALES: z
    .string()
    .default('en')
    .transform((value) => value.split(',').map((locale) => locale.trim()).filter(Boolean)),
  DEFAULT_CURRENCY: z.string().length(3).default('USD'),

  // --- Slice 1.5: Event Pipeline destinations — every one of these is
  // optional; an unset value means that destination's own isAvailable()
  // returns false and it is simply skipped (destinations/contract.ts),
  // never a boot-time failure. Real credentials are a future, per-
  // deployment concern, not a foundation-slice requirement.
  EVENTS_WEBHOOK_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  META_CAPI_ACCESS_TOKEN: z.preprocess(emptyStringToUndefined, z.string().optional()),
  GA4_API_SECRET: z.preprocess(emptyStringToUndefined, z.string().optional()),
  TIKTOK_EVENTS_ACCESS_TOKEN: z.preprocess(emptyStringToUndefined, z.string().optional()),

  // --- Slice 1.5: Preview Framework — a distinct secret from
  // GUEST_SESSION_SECRET (different purpose, different rotation
  // lifecycle: a leaked preview secret only lets someone view unpublished
  // content, never impersonate a visitor's own identity).
  PREVIEW_TOKEN_SECRET: z.string().min(32, 'PREVIEW_TOKEN_SECRET must be at least 32 characters'),
  PREVIEW_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  PUBLIC_BASE_URL: z.string().url().default('http://127.0.0.1:4000'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Parses and validates `process.env` once per process. Throws a specific,
 * actionable ZodError (never a generic "something is wrong") if any value
 * is missing or malformed — the gateway must never boot into an
 * inconsistent, half-configured state.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid Store API Gateway configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only: clears the cached env so a test can reload with a fresh source. */
export function resetEnvCacheForTests(): void {
  cached = undefined;
}
