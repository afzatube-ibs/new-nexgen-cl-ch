import { useEffect, useState, type ReactNode } from 'react';
import { Building2, Megaphone, MessageCircle, Palette, Phone, Type as TypeIcon } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Icon,
  Input,
  Spinner,
  Text,
  useToast,
  cn,
} from '@nexgen/ui';
import type { BusinessHourEntry, StoreAppearanceDTO, StoreDTO, UpdateStoreAppearanceInput } from '@nexgen/api-client';
import { PageHeader, RequirePermission } from '../../framework/index.js';
import { useAuth } from '../../auth/useAuth.js';
import { BrandAssetUpload } from './components/BrandAssetUpload.js';
import { BrandingPreview } from './components/BrandingPreview.js';
import { appearanceErrorMessage } from './shared/errors.js';
import {
  useCurrentStore,
  usePublishStoreAppearance,
  useResetStoreAppearance,
  useStoreAppearance,
  useUpdateStore,
  useUpdateStoreAppearance,
} from './queries.js';

const RADIUS_OPTIONS: { value: StoreAppearanceDTO['borderRadius']; label: string }[] = [
  { value: 'none', label: 'Square' },
  { value: 'sm', label: 'Subtle' },
  { value: 'md', label: 'Rounded' },
  { value: 'lg', label: 'Soft' },
  { value: 'full', label: 'Pill' },
];

const BUTTON_STYLE_OPTIONS: { value: StoreAppearanceDTO['buttonStyle']; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'outline', label: 'Outline' },
  { value: 'soft', label: 'Soft' },
];

/** Mirrors `StoreAppearance::TYPOGRAPHY_PRESETS` (apps/backend) — a curated, finite list, per `APPEARANCE_WORKSPACE_SPECIFICATION.md` §7.4's own "never a raw font-picker" rule. */
const TYPOGRAPHY_PRESETS: { value: string; label: string; sample: string }[] = [
  { value: 'inter-default', label: 'Inter (Default)', sample: 'font-sans' },
  { value: 'system-sans', label: 'System Sans', sample: 'font-sans' },
  { value: 'playfair-elegant', label: 'Playfair Elegant', sample: 'font-serif' },
  { value: 'poppins-modern', label: 'Poppins Modern', sample: 'font-sans' },
  { value: 'jakarta-friendly', label: 'Jakarta Friendly', sample: 'font-sans' },
];

const DAYS: { value: BusinessHourEntry['day']; label: string }[] = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

interface Draft {
  logoMediaId: string | null;
  logoAsset: StoreAppearanceDTO['logo'];
  faviconMediaId: string | null;
  faviconAsset: StoreAppearanceDTO['favicon'];
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderRadius: StoreAppearanceDTO['borderRadius'];
  typographyPreset: string;
  buttonStyle: StoreAppearanceDTO['buttonStyle'];
  announcementEnabled: boolean;
  announcementText: string;
  whatsappNumber: string;
  messengerUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  businessHours: BusinessHourEntry[];
}

function draftFromAppearance(appearance: StoreAppearanceDTO): Draft {
  return {
    logoMediaId: appearance.logo?.id ?? null,
    logoAsset: appearance.logo,
    faviconMediaId: appearance.favicon?.id ?? null,
    faviconAsset: appearance.favicon,
    primaryColor: appearance.primaryColor ?? '#4F46E5',
    secondaryColor: appearance.secondaryColor ?? '#0EA5E9',
    accentColor: appearance.accentColor ?? '#F59E0B',
    borderRadius: appearance.borderRadius,
    typographyPreset: appearance.typographyPreset,
    buttonStyle: appearance.buttonStyle,
    announcementEnabled: appearance.announcementEnabled,
    announcementText: appearance.announcementText ?? '',
    whatsappNumber: appearance.social.whatsappNumber ?? '',
    messengerUrl: appearance.social.messengerUrl ?? '',
    facebookUrl: appearance.social.facebookUrl ?? '',
    instagramUrl: appearance.social.instagramUrl ?? '',
    tiktokUrl: appearance.social.tiktokUrl ?? '',
    youtubeUrl: appearance.social.youtubeUrl ?? '',
    businessHours: appearance.businessHours ?? DAYS.map((d) => ({ day: d.value, open: '09:00', close: '18:00', closed: false })),
  };
}

function toUpdateInput(draft: Draft): UpdateStoreAppearanceInput {
  return {
    logoMediaId: draft.logoMediaId,
    faviconMediaId: draft.faviconMediaId,
    primaryColor: draft.primaryColor || null,
    secondaryColor: draft.secondaryColor || null,
    accentColor: draft.accentColor || null,
    borderRadius: draft.borderRadius,
    typographyPreset: draft.typographyPreset,
    buttonStyle: draft.buttonStyle,
    announcementEnabled: draft.announcementEnabled,
    announcementText: draft.announcementText || null,
    whatsappNumber: draft.whatsappNumber || null,
    messengerUrl: draft.messengerUrl || null,
    facebookUrl: draft.facebookUrl || null,
    instagramUrl: draft.instagramUrl || null,
    tiktokUrl: draft.tiktokUrl || null,
    youtubeUrl: draft.youtubeUrl || null,
    businessHours: draft.businessHours,
  };
}

interface StoreDraft {
  name: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
}

function storeDraftFrom(store: StoreDTO): StoreDraft {
  return {
    name: store.name,
    contactEmail: store.contactEmail,
    contactPhone: store.contactPhone ?? '',
    addressLine1: store.address.line1,
    addressLine2: store.address.line2 ?? '',
    city: store.address.city,
    region: store.address.region ?? '',
    postalCode: store.address.postalCode ?? '',
    countryCode: store.address.countryCode,
  };
}

/**
 * Beta Experience Pack 1 — Appearance's own Branding screen, per
 * `planning/architecture/APPEARANCE_WORKSPACE_SPECIFICATION.md` §7.
 * Deliberately the ONLY screen this Pack builds under Appearance — Theme
 * Studio/Homepage Builder/Menus/Custom Code are later Experience Packs
 * (that document's own §14), not stubbed here with placeholder UI.
 *
 * Two independently-saved concerns, presented honestly as such rather than
 * one undifferentiated form: **Store Identity & Business Info** (name,
 * contact, address — real `Store` fields, save immediately, no draft/
 * publish cycle, since these are business facts, not a customer-facing
 * "look") and **Brand Identity** (logo through business hours — real
 * `StoreAppearance` fields, save as a real draft, only visible to real
 * customers once explicitly Published — `APPEARANCE_WORKSPACE_
 * SPECIFICATION.md` §10's own lightweight Pack-1 publish flow).
 */
export function BrandingPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('appearance.branding.manage');

  const storeQuery = useCurrentStore();
  const store = storeQuery.data?.[0];
  const appearanceQuery = useStoreAppearance(store?.id);
  const appearance = appearanceQuery.data;

  const updateStoreMutation = useUpdateStore();
  const updateAppearanceMutation = useUpdateStoreAppearance(store?.id);
  const publishMutation = usePublishStoreAppearance(store?.id);
  const resetMutation = useResetStoreAppearance(store?.id);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [storeDraft, setStoreDraft] = useState<StoreDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (appearance) setDraft(draftFromAppearance(appearance));
  }, [appearance]);

  useEffect(() => {
    if (store) setStoreDraft(storeDraftFrom(store));
  }, [store]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateStoreField<K extends keyof StoreDraft>(key: K, value: StoreDraft[K]) {
    setStoreDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateHour(day: BusinessHourEntry['day'], patch: Partial<BusinessHourEntry>) {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, businessHours: current.businessHours.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)) };
    });
  }

  const colorErrors = draft
    ? {
        primaryColor: draft.primaryColor && !HEX_PATTERN.test(draft.primaryColor) ? 'Use a hex color, e.g. #4F46E5' : undefined,
        secondaryColor: draft.secondaryColor && !HEX_PATTERN.test(draft.secondaryColor) ? 'Use a hex color, e.g. #0EA5E9' : undefined,
        accentColor: draft.accentColor && !HEX_PATTERN.test(draft.accentColor) ? 'Use a hex color, e.g. #F59E0B' : undefined,
      }
    : {};
  const hasColorErrors = Object.values(colorErrors).some(Boolean);

  async function handleSave() {
    if (!store || !draft || !storeDraft || !appearance) return;
    setFormError(null);
    if (hasColorErrors) {
      setFormError('Fix the highlighted color values before saving.');
      return;
    }
    try {
      await Promise.all([
        updateStoreMutation.mutateAsync({ id: store.id, changes: storeDraft, expectedVersion: store.version }),
        updateAppearanceMutation.mutateAsync({ changes: toUpdateInput(draft), expectedVersion: appearance.version }),
      ]);
      toast({ variant: 'success', title: 'Draft saved', description: 'Your changes are saved. Publish to make brand changes live on your Storefront.' });
    } catch (error) {
      setFormError(appearanceErrorMessage(error));
    }
  }

  async function handlePublish() {
    if (!appearance) return;
    setFormError(null);
    try {
      await publishMutation.mutateAsync({ expectedVersion: appearance.version });
      toast({ variant: 'success', title: 'Published', description: 'Your brand identity is now live on your Storefront.' });
    } catch (error) {
      setFormError(appearanceErrorMessage(error));
    }
  }

  async function handleReset() {
    if (!appearance) return;
    setFormError(null);
    try {
      await resetMutation.mutateAsync({ expectedVersion: appearance.version });
      toast({ variant: 'success', title: 'Reset', description: 'Your draft has been restored to the last published version.' });
    } catch (error) {
      setFormError(appearanceErrorMessage(error));
    }
  }

  const saving = updateStoreMutation.isPending || updateAppearanceMutation.isPending;

  if (storeQuery.isLoading || appearanceQuery.isLoading || !draft || !storeDraft || !store || !appearance) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!store) {
    return (
      <Alert variant="warning" title="No store configured">
        Branding needs a real store to attach to — none exists yet.
      </Alert>
    );
  }

  return (
    <RequirePermission anyOf={['appearance.branding.view']}>
      <PageHeader
        title="Branding"
        description="How your store looks and feels to customers — logo, colors, typography, and contact presence."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => void handleReset()} loading={resetMutation.isPending} disabled={!appearance.isPublished}>
                Reset
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleSave()} loading={saving}>
                Save draft
              </Button>
              <Button type="button" onClick={() => void handlePublish()} loading={publishMutation.isPending} disabled={!appearance.hasUnpublishedChanges}>
                Publish
              </Button>
            </div>
          ) : undefined
        }
      />

      {appearance.hasUnpublishedChanges && (
        <Alert variant="warning" className="mb-6">
          You have unpublished brand changes. Customers still see your last published version until you Publish.
        </Alert>
      )}
      {formError && (
        <Alert variant="danger" className="mb-6" role="alert">
          {formError}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Icon icon={Building2} className="text-brand" />
              <CardTitle>Store identity</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Text as="p" variant="caption" className="text-text-secondary">
                Applies immediately — these are your store&apos;s real business details, not a customer-facing draft.
              </Text>
              <Input label="Store name" value={storeDraft.name} onChange={(e) => updateStoreField('name', e.target.value)} disabled={!canManage} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Support email" type="email" value={storeDraft.contactEmail} onChange={(e) => updateStoreField('contactEmail', e.target.value)} disabled={!canManage} />
                <Input label="Support phone" value={storeDraft.contactPhone} onChange={(e) => updateStoreField('contactPhone', e.target.value)} disabled={!canManage} />
              </div>
              <Input label="Address line 1" value={storeDraft.addressLine1} onChange={(e) => updateStoreField('addressLine1', e.target.value)} disabled={!canManage} />
              <Input label="Address line 2 (optional)" value={storeDraft.addressLine2} onChange={(e) => updateStoreField('addressLine2', e.target.value)} disabled={!canManage} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="City" value={storeDraft.city} onChange={(e) => updateStoreField('city', e.target.value)} disabled={!canManage} />
                <Input label="Region" value={storeDraft.region} onChange={(e) => updateStoreField('region', e.target.value)} disabled={!canManage} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Postal code" value={storeDraft.postalCode} onChange={(e) => updateStoreField('postalCode', e.target.value)} disabled={!canManage} />
                <Input label="Country code" maxLength={2} className="uppercase" value={storeDraft.countryCode} onChange={(e) => updateStoreField('countryCode', e.target.value.toUpperCase())} disabled={!canManage} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Icon icon={Palette} className="text-brand" />
              <CardTitle>Logo &amp; favicon</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <BrandAssetUpload
                label="Logo"
                hint="Shown in your Storefront header and footer. PNG, JPG, or WebP."
                asset={draft.logoAsset}
                onChange={(mediaId) => update('logoMediaId', mediaId)}
              />
              <BrandAssetUpload
                label="Favicon"
                hint="Shown in the browser tab. Square, ideally 512×512."
                asset={draft.faviconAsset}
                onChange={(mediaId) => update('faviconMediaId', mediaId)}
                previewSize="sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Icon icon={Palette} className="text-brand" />
              <CardTitle>Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <ColorField label="Primary" value={draft.primaryColor} error={colorErrors.primaryColor} onChange={(v) => update('primaryColor', v)} disabled={!canManage} />
              <ColorField label="Secondary" value={draft.secondaryColor} error={colorErrors.secondaryColor} onChange={(v) => update('secondaryColor', v)} disabled={!canManage} />
              <ColorField label="Accent" value={draft.accentColor} error={colorErrors.accentColor} onChange={(v) => update('accentColor', v)} disabled={!canManage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Icon icon={TypeIcon} className="text-brand" />
              <CardTitle>Typography &amp; buttons</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Text as="span" variant="label" className="text-text-primary">
                  Typography
                </Text>
                <div className="flex flex-wrap gap-2">
                  {TYPOGRAPHY_PRESETS.map((preset) => (
                    <Pill key={preset.value} active={draft.typographyPreset === preset.value} onClick={() => update('typographyPreset', preset.value)} disabled={!canManage}>
                      {preset.label}
                    </Pill>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Text as="span" variant="label" className="text-text-primary">
                  Button style
                </Text>
                <div className="flex flex-wrap gap-2">
                  {BUTTON_STYLE_OPTIONS.map((option) => (
                    <Pill key={option.value} active={draft.buttonStyle === option.value} onClick={() => update('buttonStyle', option.value)} disabled={!canManage}>
                      {option.label}
                    </Pill>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Text as="span" variant="label" className="text-text-primary">
                  Border radius
                </Text>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map((option) => (
                    <Pill key={option.value} active={draft.borderRadius === option.value} onClick={() => update('borderRadius', option.value)} disabled={!canManage}>
                      {option.label}
                    </Pill>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Icon icon={Megaphone} className="text-brand" />
              <CardTitle>Announcement bar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.announcementEnabled}
                  onChange={(e) => update('announcementEnabled', e.target.checked)}
                  disabled={!canManage}
                  className="size-4 rounded border-border"
                />
                <Text as="span" variant="body">
                  Show an announcement bar at the top of your Storefront
                </Text>
              </label>
              <Input
                label="Announcement text"
                placeholder="Free delivery over ৳2,000"
                value={draft.announcementText}
                onChange={(e) => update('announcementText', e.target.value)}
                disabled={!canManage || !draft.announcementEnabled}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Icon icon={MessageCircle} className="text-brand" />
              <CardTitle>Social &amp; contact links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Input label="WhatsApp number" placeholder="+8801XXXXXXXXX" value={draft.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value)} disabled={!canManage} />
              <Input label="Messenger URL" placeholder="https://m.me/yourpage" value={draft.messengerUrl} onChange={(e) => update('messengerUrl', e.target.value)} disabled={!canManage} />
              <Input label="Facebook URL" value={draft.facebookUrl} onChange={(e) => update('facebookUrl', e.target.value)} disabled={!canManage} />
              <Input label="Instagram URL" value={draft.instagramUrl} onChange={(e) => update('instagramUrl', e.target.value)} disabled={!canManage} />
              <Input label="TikTok URL" value={draft.tiktokUrl} onChange={(e) => update('tiktokUrl', e.target.value)} disabled={!canManage} />
              <Input label="YouTube URL" value={draft.youtubeUrl} onChange={(e) => update('youtubeUrl', e.target.value)} disabled={!canManage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Icon icon={Phone} className="text-brand" />
              <CardTitle>Business hours</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {draft.businessHours.map((entry) => {
                const dayLabel = DAYS.find((d) => d.value === entry.day)?.label ?? entry.day;
                return (
                  <div key={entry.day} className="grid grid-cols-[6rem_1fr_1fr_auto] items-center gap-3">
                    <Text as="span" variant="body-strong">
                      {dayLabel}
                    </Text>
                    <Input type="time" value={entry.open ?? ''} onChange={(e) => updateHour(entry.day, { open: e.target.value })} disabled={!canManage || entry.closed} />
                    <Input type="time" value={entry.close ?? ''} onChange={(e) => updateHour(entry.day, { close: e.target.value })} disabled={!canManage || entry.closed} />
                    <label className="flex items-center gap-1.5 whitespace-nowrap">
                      <input type="checkbox" checked={Boolean(entry.closed)} onChange={(e) => updateHour(entry.day, { closed: e.target.checked })} disabled={!canManage} className="size-4 rounded border-border" />
                      <Text as="span" variant="caption" className="text-text-secondary">
                        Closed
                      </Text>
                    </label>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <BrandingPreview draft={draft} storeName={storeDraft.name} />
        </div>
      </div>
    </RequirePermission>
  );
}

function ColorField({ label, value, error, onChange, disabled }: { label: string; value: string; error?: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Text as="span" variant="label" className="text-text-primary">
        {label}
      </Text>
      <div className="flex items-center gap-2">
        <span className="size-9 shrink-0 rounded-md border border-border" style={{ backgroundColor: HEX_PATTERN.test(value) ? value : 'transparent' }} aria-hidden="true" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} error={error} disabled={disabled} className="font-mono uppercase" />
      </div>
    </div>
  );
}

function Pill({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'rounded-md border px-3 py-1.5 text-body transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'border-brand bg-surface-subtle text-text-primary' : 'border-border text-text-secondary hover:bg-surface-subtle',
      )}
    >
      {children}
    </button>
  );
}
