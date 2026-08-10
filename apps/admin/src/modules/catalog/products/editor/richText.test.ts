import { describe, expect, it } from 'vitest';
import { wrapSelection, togglePrefixOnLines } from './richText.js';

describe('wrapSelection', () => {
  it('wraps a selected substring', () => {
    const result = wrapSelection('Hello world', 6, 11, '**');
    expect(result.text).toBe('Hello **world**');
    expect(result.selectionStart).toBe(8);
    expect(result.selectionEnd).toBe(13);
  });

  it('inserts an empty pair when nothing is selected, cursor placed between', () => {
    const result = wrapSelection('Hello ', 6, 6, '*');
    expect(result.text).toBe('Hello **');
    expect(result.selectionStart).toBe(7);
    expect(result.selectionEnd).toBe(7);
  });

  it('supports asymmetric before/after (link syntax)', () => {
    const result = wrapSelection('see here', 4, 8, '[', '](url)');
    expect(result.text).toBe('see [here](url)');
  });
});

describe('togglePrefixOnLines', () => {
  it('prefixes a single line with no existing prefix', () => {
    const result = togglePrefixOnLines('Buy milk', 0, 8, '- ');
    expect(result.text).toBe('- Buy milk');
  });

  it('prefixes every line spanned by a multi-line selection', () => {
    const value = 'Milk\nEggs\nBread';
    const result = togglePrefixOnLines(value, 0, value.length, '- ');
    expect(result.text).toBe('- Milk\n- Eggs\n- Bread');
  });

  it('removes the prefix when every touched line already has it (toggle off)', () => {
    const value = '- Milk\n- Eggs';
    const result = togglePrefixOnLines(value, 0, value.length, '- ');
    expect(result.text).toBe('Milk\nEggs');
  });

  it('leaves blank lines within the selection untouched', () => {
    const value = 'Milk\n\nEggs';
    const result = togglePrefixOnLines(value, 0, value.length, '- ');
    expect(result.text).toBe('- Milk\n\n- Eggs');
  });
});
