/**
 * Product Import Engine — future extension point (Phase 2.2 scope decision).
 * Products are relational (variants, media, categories/collections, SEO,
 * relationships) and are deliberately NOT importable via the generic
 * `runCsvImport` used by the flat taxonomy entities (Brands/Categories/
 * Collections/Tags/Attribute Groups/Attributes) — flattening them into CSV
 * rows without a real backend batch/import pipeline (transactions,
 * validation, dry-run preview, progress, rollback, resume) would be
 * unsafe and is explicitly out of scope here.
 *
 * Mirrors `apps/admin/src/extension-points/index.ts`'s own pattern from
 * Phase 2.1: a TYPE ONLY, zero runtime code — a stub function that "does
 * nothing yet" would itself be the placeholder implementation this
 * platform's quality bar forbids. `ProductsListPage`'s Import button stays
 * disabled and references this contract's existence, not a fake handler.
 *
 * A future dedicated Product Import module implements this (CSV first,
 * later XLSX/XML/JSON/supplier feeds/ERP integrations per the Product
 * Owner's own stated roadmap) and wires it in without any change to
 * `ProductsListPage` itself.
 */
export interface ProductImportEngineContract {
  /** Validate-only pass — no writes — surfacing per-row errors before any import runs. */
  dryRun: (file: File) => Promise<{ rowCount: number; errors: { row: number; message: string }[] }>;
  /** Runs the real import; progress/results stream the same shape the Bulk orchestration layer already established (`framework/bulk/useBulkOperation.ts`), reused rather than reinvented. */
  run: (file: File, onProgress: (completed: number, total: number) => void) => Promise<{ succeeded: number; failed: number }>;
}
