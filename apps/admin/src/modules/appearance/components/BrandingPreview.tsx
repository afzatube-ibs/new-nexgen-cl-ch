import type { CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Text } from '@nexgen/ui';

export interface BrandingPreviewDraft {
  logoAsset: { url: string } | null;
  primaryColor: string;
  buttonStyle: 'solid' | 'outline' | 'soft';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  typographyPreset: string;
  announcementEnabled: boolean;
  announcementText: string;
}

const RADIUS_PX: Record<BrandingPreviewDraft['borderRadius'], string> = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '999px',
};

const FONT_STACK: Record<string, string> = {
  'inter-default': 'Inter, ui-sans-serif, system-ui, sans-serif',
  'system-sans': 'ui-sans-serif, system-ui, sans-serif',
  'playfair-elegant': '"Playfair Display", ui-serif, Georgia, serif',
  'poppins-modern': 'Poppins, ui-sans-serif, system-ui, sans-serif',
  'jakarta-friendly': '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
};

function buttonStyleFor(draft: BrandingPreviewDraft): CSSProperties {
  const radius = RADIUS_PX[draft.borderRadius];
  const color = /^#[0-9A-Fa-f]{6}$/.test(draft.primaryColor) ? draft.primaryColor : '#4F46E5';
  if (draft.buttonStyle === 'outline') {
    return { borderRadius: radius, border: `2px solid ${color}`, color, backgroundColor: 'transparent' };
  }
  if (draft.buttonStyle === 'soft') {
    return { borderRadius: radius, backgroundColor: `${color}1A`, color, border: 'none' };
  }
  return { borderRadius: radius, backgroundColor: color, color: '#fff', border: 'none' };
}

/**
 * Beta Experience Pack 1 — `APPEARANCE_WORKSPACE_SPECIFICATION.md` §2/§7's
 * own "see it live" requirement, this Pack's real, honest scope: a live,
 * client-side-computed mockup driven entirely by the current unsaved
 * draft — never a round trip, never a screenshot of the real Storefront
 * (that live-iframe mechanism is Theme Studio's own, a later Pack, per
 * that document's §14). Every value shown here is real (the merchant's
 * own current draft, not fabricated sample data) even though the
 * *surface* is a mockup, not the real rendered Storefront.
 */
export function BrandingPreview({ draft, storeName }: { draft: BrandingPreviewDraft; storeName: string }) {
  const fontFamily = FONT_STACK[draft.typographyPreset] ?? FONT_STACK['inter-default'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live preview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Text as="p" variant="caption" className="text-text-secondary">
          A live mockup of your unsaved draft — not yet what customers see.
        </Text>
        <div className="overflow-hidden rounded-md border border-border" style={{ fontFamily }}>
          {draft.announcementEnabled && draft.announcementText && (
            <div className="px-3 py-1.5 text-center text-caption text-white" style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(draft.primaryColor) ? draft.primaryColor : '#4F46E5' }}>
              {draft.announcementText}
            </div>
          )}
          <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
            {draft.logoAsset ? (
              <img src={draft.logoAsset.url} alt="Logo preview" className="h-6 w-auto object-contain" />
            ) : (
              <span className="text-body-strong" style={{ fontFamily }}>
                {storeName}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3 bg-surface p-4">
            <span className="text-heading" style={{ fontFamily }}>
              Welcome to {storeName}
            </span>
            <span className="text-body text-text-secondary">This is how your headings and body text will look.</span>
            <button type="button" className="w-fit px-4 py-2 text-body-strong" style={buttonStyleFor(draft)} disabled>
              Add to cart
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
