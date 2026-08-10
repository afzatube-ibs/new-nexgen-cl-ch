import type { RefObject } from 'react';
import { Bold, Italic, List, Link as LinkIcon } from 'lucide-react';
import { Button } from '@nexgen/ui';
import { wrapSelection, togglePrefixOnLines } from './richText.js';

export interface RichTextToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}

/**
 * A markdown-style plain-text authoring convenience for the Description
 * field — see `richText.ts`'s own docblock for exactly what this is (and
 * isn't). Operates on the real textarea selection via `textareaRef`
 * (`ProductFormPage` merges this ref with React Hook Form's own `field.ref`
 * for the `description` `Controller`), restoring focus and selection after
 * each edit so a merchant can keep formatting without re-finding their
 * place.
 */
export function RichTextToolbar({ textareaRef, value, onChange }: RichTextToolbarProps) {
  function apply(edit: (val: string, start: number, end: number) => { text: string; selectionStart: number; selectionEnd: number }): void {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const result = edit(value, start, end);
    onChange(result.text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div className="mb-1.5 flex items-center gap-0.5" role="toolbar" aria-label="Description formatting">
      <Button type="button" variant="ghost" size="sm" className="size-7 p-0" onClick={() => apply((v, s, e) => wrapSelection(v, s, e, '**'))} aria-label="Bold">
        <Bold className="size-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="size-7 p-0" onClick={() => apply((v, s, e) => wrapSelection(v, s, e, '*'))} aria-label="Italic">
        <Italic className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-7 p-0"
        onClick={() => apply((v, s, e) => togglePrefixOnLines(v, s, e, '- '))}
        aria-label="Bulleted list"
      >
        <List className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-7 p-0"
        onClick={() => apply((v, s, e) => wrapSelection(v, s, e, '[', '](url)'))}
        aria-label="Link"
      >
        <LinkIcon className="size-3.5" />
      </Button>
    </div>
  );
}
