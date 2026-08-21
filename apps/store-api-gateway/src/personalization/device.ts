/**
 * Minimal, dependency-free device classification from User-Agent —
 * deliberately not a full UA-parsing library: this Gateway needs
 * "mobile/tablet/desktop" for personalization/analytics bucketing, not a
 * precise browser/OS fingerprint (which would itself be a privacy-relevant
 * data point requiring its own CDP_ARCHITECTURE.md §3.3 consent
 * consideration this slice does not need to take on).
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface DeviceInfo {
  type: DeviceType;
  isBot: boolean;
}

const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot/i;
const TABLET_PATTERN = /ipad|tablet|(android(?!.*mobile))/i;
const MOBILE_PATTERN = /mobi|iphone|ipod|android/i;

export function classifyDevice(userAgent: string | undefined): DeviceInfo {
  if (!userAgent) return { type: 'unknown', isBot: false };
  const isBot = BOT_PATTERN.test(userAgent);
  if (TABLET_PATTERN.test(userAgent)) return { type: 'tablet', isBot };
  if (MOBILE_PATTERN.test(userAgent)) return { type: 'mobile', isBot };
  return { type: 'desktop', isBot };
}
