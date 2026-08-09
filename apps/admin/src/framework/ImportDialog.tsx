import { useState } from 'react';
import { Upload } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Alert,
  Text,
} from '@nexgen/ui';
import { parseCsv } from './csv.js';

export interface ImportDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  /** Called with the parsed rows once the operator confirms — the module owns validation/submission; this component owns file selection, parsing, and preview only. Return an error message to keep the dialog open and show it. */
  onImport: (rows: Record<string, string>[]) => Promise<string | void>;
}

/**
 * Shared Framework — Import (Phase 2.1 §6). File select → parse → preview →
 * confirm, real CSV parsing (csv.ts), genuinely functional — the part that
 * is intentionally module-specific (field mapping rules, per-row business
 * validation) is the `onImport` callback each future module supplies.
 */
export function ImportDialog({ trigger, title, description, onImport }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset(): void {
    setHeaders([]);
    setRows([]);
    setError(null);
  }

  async function handleFile(file: File): Promise<void> {
    setError(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.rows.length === 0) {
      setError('No data rows were found in this file.');
      return;
    }
    setHeaders(parsed.headers);
    setRows(parsed.rows);
  }

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const result = await onImport(rows);
      if (typeof result === 'string') {
        setError(result);
        return;
      }
      setOpen(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {rows.length === 0 ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-10 text-center hover:border-brand">
            <Upload className="size-6 text-text-secondary" />
            <Text variant="body-strong">Choose a CSV file</Text>
            <Text variant="caption" className="text-text-secondary">
              or drag and drop
            </Text>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
        ) : (
          <div className="max-h-72 overflow-auto">
            <Text variant="caption" className="mb-2 text-text-secondary">
              {rows.length} row{rows.length === 1 ? '' : 's'} found — previewing the first 10
            </Text>
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 10).map((row, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- unconfirmed preview rows have no stable identity before import
                  <TableRow key={i}>
                    {headers.map((h) => (
                      <TableCell key={h}>{row[h]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} loading={submitting} disabled={rows.length === 0}>
            Import {rows.length > 0 ? `${rows.length} rows` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
