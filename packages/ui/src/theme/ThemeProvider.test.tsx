import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeProvider.js';

function ThemeProbe() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setPreference('dark')}>Set dark</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to system preference and stamps data-theme on the root', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe(screen.getByTestId('resolved').textContent);
  });

  it('persists an explicit choice to localStorage and applies it to the root', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Set dark' }));

    expect(screen.getByTestId('preference')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('nexgen-admin-theme')).toBe('dark');
  });

  it('throws when useTheme is used outside a ThemeProvider', () => {
    // Suppress the expected React error-boundary console noise for this one assertion.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeProbe />)).toThrow('useTheme must be used within a <ThemeProvider>.');
    spy.mockRestore();
  });
});
