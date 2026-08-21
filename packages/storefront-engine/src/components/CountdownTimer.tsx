'use client';

import { useEffect, useState } from 'react';
import { Text, cn } from '@nexgen/ui';

/**
 * Store Components library — Beta Milestone 2.5's own "Countdown" build
 * item, built as a real, fully-functional timer component: given a real
 * `targetDate`, it counts down accurately, live, client-side. **No page
 * in this milestone feeds it a fabricated end-time** — no Flash Sale /
 * campaign backend exists anywhere in the Gateway or Commerce backend to
 * source a real one from (`MERCHANT_CONVERSION_AUDIT.md` names this gap).
 * The component itself is real and launch-ready the moment a real
 * campaign end-time exists; inventing one here to make a demo look
 * livelier would be exactly the fabrication this engagement rejects
 * everywhere else.
 */
export interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  label?: string;
  className?: string;
}

function getRemaining(target: Date) {
  const totalMs = Math.max(0, target.getTime() - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: totalMs <= 0,
  };
}

export function CountdownTimer({ targetDate, onComplete, label, className }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => getRemaining(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getRemaining(targetDate);
      setRemaining(next);
      if (next.done) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  useEffect(() => {
    if (remaining.done) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once when `done` transitions true, not on every tick.
  }, [remaining.done]);

  if (remaining.done) return null;

  const segments: { value: number; unit: string }[] = [
    { value: remaining.days, unit: 'd' },
    { value: remaining.hours, unit: 'h' },
    { value: remaining.minutes, unit: 'm' },
    { value: remaining.seconds, unit: 's' },
  ];

  return (
    <div className={cn('flex items-center gap-2', className)} role="timer" aria-live="polite">
      {label && (
        <Text as="span" variant="caption" className="text-text-secondary">
          {label}
        </Text>
      )}
      <div className="flex items-center gap-1">
        {segments.map((segment) => (
          <span key={segment.unit} className="flex items-baseline gap-0.5 rounded-md bg-surface-subtle px-1.5 py-0.5">
            <span className="text-body-strong text-text-primary tabular-nums">{String(segment.value).padStart(2, '0')}</span>
            <span className="text-caption text-text-secondary">{segment.unit}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
