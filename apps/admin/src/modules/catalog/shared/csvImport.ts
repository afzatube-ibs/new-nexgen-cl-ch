/**
 * CSV import for the flat taxonomy entities only (Brands, Categories,
 * Collections, Tags, Attribute Groups, Attributes) — per the Phase 2.2
 * scope decision, Products are relational (variants/media/categories) and
 * are not safe to flatten into CSV rows without a real backend import
 * engine; see `productImportExtensionPoint.ts`.
 *
 * A plain async function, not a hook — it holds no state of its own.
 * `ImportDialog` (Shared Framework) already owns file-select/parse/preview
 * state; this only maps its parsed rows onto the entity's own `create`
 * call, sequentially, and returns the single summary string `ImportDialog`
 * expects (`onImport: (rows) => Promise<string | void>`).
 */
export interface CsvImportRowError {
  rowNumber: number;
  message: string;
}

export async function runCsvImport<TCreate>(
  rows: Record<string, string>[],
  mapRow: (row: Record<string, string>) => TCreate,
  createFn: (input: TCreate) => Promise<unknown>,
): Promise<string | void> {
  let succeeded = 0;
  const errors: CsvImportRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const input = mapRow(row);
      await createFn(input);
      succeeded++;
    } catch (error) {
      errors.push({ rowNumber: i + 1, message: error instanceof Error ? error.message : 'Import failed.' });
    }
  }

  if (errors.length === 0) return undefined;

  const failedSummary = errors.map((e) => `row ${e.rowNumber} (${e.message})`).join(', ');
  return `${succeeded} of ${rows.length} rows imported. Failed: ${failedSummary}`;
}
