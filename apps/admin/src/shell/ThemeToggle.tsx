import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, SegmentedControl, type ThemePreference } from '@nexgen/ui';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** ADMIN_SHELL_ARCHITECTURE.md §3: fully real, three-state (Light/Dark/System) — not a placeholder. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return <SegmentedControl value={preference} onValueChange={setPreference} options={OPTIONS} ariaLabel="Theme" />;
}
