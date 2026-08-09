import { Download } from 'lucide-react';
import { Button } from '@nexgen/ui';
import { toCsv, downloadFile } from './csv.js';

export interface ExportButtonProps<T extends Record<string, string | number | boolean | null | undefined>> {
  rows: T[];
  columns: { key: keyof T & string; header: string }[];
  filename: string;
  disabled?: boolean;
}

/** Shared Framework — Export (Phase 2.1 §6). Real CSV generation client-side; a future large-export flow (server-generated, async, emailed) is this component's own documented, additive upgrade path, not a redesign. */
export function ExportButton<T extends Record<string, string | number | boolean | null | undefined>>({
  rows,
  columns,
  filename,
  disabled,
}: ExportButtonProps<T>) {
  function handleExport(): void {
    const csv = toCsv(
      rows.map((row) => Object.fromEntries(columns.map((c) => [c.header, row[c.key]]))),
      columns.map((c) => c.header),
    );
    downloadFile(`${filename}.csv`, csv, 'text/csv;charset=utf-8;');
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={disabled || rows.length === 0}>
      <Download className="size-4" />
      Export CSV
    </Button>
  );
}
