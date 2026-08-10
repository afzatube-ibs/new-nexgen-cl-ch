/**
 * Plain-text editing helpers for the Description field's toolbar.
 * `Product.description` (apps/backend) is a plain nullable `string`
 * column — no format flag, no HTML/Markdown rendering anywhere yet — so
 * this is deliberately a **markdown-style plain-text authoring
 * convenience**, not a rich text/HTML editor or a WYSIWYG. It never claims
 * the result will render as formatted text anywhere; it just makes typing
 * `**bold**`/`- lists` faster than doing it by hand. A real WYSIWYG would
 * need a new backend column (format/HTML), which is out of this slice's
 * "reuse the existing contract, don't invent one" rule.
 */

export interface SelectionEdit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Wraps the current selection in `before`/`after` (e.g. `**`/`**` for bold). With no selection, inserts an empty pair and places the cursor between them. */
export function wrapSelection(value: string, start: number, end: number, before: string, after: string = before): SelectionEdit {
  const selected = value.slice(start, end);
  const text = value.slice(0, start) + before + selected + after + value.slice(end);
  return { text, selectionStart: start + before.length, selectionEnd: start + before.length + selected.length };
}

/** Prefixes every line touched by the selection with `prefix` (e.g. `"- "` for a bullet list) — toggles it off if every touched line already has it. */
export function togglePrefixOnLines(value: string, start: number, end: number, prefix: string): SelectionEdit {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = value.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const allPrefixed = lines.every((line) => line.startsWith(prefix) || line.trim() === '');

  const nextLines = lines.map((line) => {
    if (line.trim() === '') return line;
    return allPrefixed ? line.slice(prefix.length) : `${prefix}${line}`;
  });
  const nextBlock = nextLines.join('\n');

  const text = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  const delta = nextBlock.length - block.length;
  return { text, selectionStart: start + (allPrefixed ? -prefix.length : prefix.length), selectionEnd: end + delta };
}
