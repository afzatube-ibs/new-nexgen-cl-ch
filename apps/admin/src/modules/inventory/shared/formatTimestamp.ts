/**
 * "8/12/2026, 12:18:01 AM" (the raw `Date#toLocaleString()` output Slice 1
 * shipped with) makes a merchant do the "how long ago was that" math
 * themselves. This turns the same real `createdAt` timestamp into a
 * day-grouping label ("Today" / "Yesterday" / a short date) plus a compact
 * time — display formatting only, the underlying data is unchanged.
 */
export function dayGroupLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
