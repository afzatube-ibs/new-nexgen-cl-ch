/**
 * Shared Framework — the CSV primitives Import/Export both build on. A
 * small, dependency-free, RFC-4180-adequate implementation (quoted fields,
 * embedded commas/newlines, doubled-quote escaping) — not a placeholder;
 * genuinely handles the common real-world CSV shapes a merchant's export
 * from another platform is likely to use.
 */
type CsvCellValue = string | number | boolean | null | undefined;

export function toCsv(rows: Record<string, CsvCellValue>[], columns: string[]): string {
  const escape = (value: CsvCellValue): string => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [columns.map(escape).join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => escape(row[col])).join(','));
  }
  return lines.join('\r\n');
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) return { headers: [], rows: [] };

  return {
    headers,
    rows: dataRows.map((cells) => Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? '']))),
  };
}

/** Triggers a browser download of `content` as `filename` — the shared mechanism `ExportButton` and any future export format use. */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
