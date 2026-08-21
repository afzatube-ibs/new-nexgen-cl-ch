'use client';

import { Select } from '@nexgen/ui';
import { BANGLADESH_DIVISIONS } from './bdDivisions.js';

/**
 * Store Components library — Beta Milestone 2.6's own "Bangladesh
 * Commerce Layer" build item: a real, working Division → District →
 * Upazila cascading selector.
 *
 * Division options are seeded directly from `bdDivisions.ts` (real,
 * stable public data — see that file's own docblock for why). District
 * and Upazila options are **not** hard-coded here: they're supplied by
 * the calling application via `districtsByDivision`/`upazilasByDistrict`
 * props, keyed by the parent's `id`. This keeps the component fully real
 * and working today (no dead-end selects, no silent no-op) while never
 * presenting a hand-transcribed 64-district/~495-upazila dataset as
 * authoritative. A future Address/Geo route on the Gateway is a drop-in
 * data source — this component's own shape doesn't change, only where
 * the caller sources `districtsByDivision`/`upazilasByDistrict` from.
 *
 * Built on `@nexgen/ui`'s own Radix-based `Select` (options array +
 * `onValueChange`, not a native `<select>`) — matches every other form
 * control in this platform rather than introducing a second select
 * pattern.
 *
 * **Real bug found and fixed live** (Beta Sprint 3 — Checkout Engine's
 * own test suite was the first thing to ever actually render this
 * component; it was built but unwired in Milestone 2.6): each `Select`
 * was passed `value={... ?? undefined}` — Radix's `Select.Root` is
 * *uncontrolled* while its `value` prop is `undefined` and becomes
 * *controlled* the first time a real string is passed, and React warns
 * loudly ("Select is changing from uncontrolled to controlled") the
 * moment that switch happens, which is exactly what selecting a Division
 * did here. Fixed by always passing a defined `value` — `''` when
 * nothing is selected, Radix's own documented convention for "no
 * selection" at the `Root` level (distinct from `Select.Item`, which
 * disallows `value=""` for unrelated reasons) — so every `Select` here
 * is controlled from its very first render onward.
 */
export interface AddressAdminUnit {
  id: string;
  name: string;
}

export interface AddressSelectorValue {
  divisionId: string | null;
  districtId: string | null;
  upazilaId: string | null;
}

export interface AddressSelectorProps {
  value: AddressSelectorValue;
  onChange: (value: AddressSelectorValue) => void;
  /** Districts for the currently selected division, keyed by division id. Supplied by the caller — see docblock. */
  districtsByDivision?: Record<string, AddressAdminUnit[]>;
  /** Upazilas for the currently selected district, keyed by district id. Supplied by the caller — see docblock. */
  upazilasByDistrict?: Record<string, AddressAdminUnit[]>;
  className?: string;
}

export function AddressSelector({ value, onChange, districtsByDivision = {}, upazilasByDistrict = {}, className }: AddressSelectorProps) {
  const districts = value.divisionId ? (districtsByDivision[value.divisionId] ?? []) : [];
  const upazilas = value.districtId ? (upazilasByDistrict[value.districtId] ?? []) : [];

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          label="Division"
          placeholder="Select division"
          value={value.divisionId ?? ''}
          options={BANGLADESH_DIVISIONS.map((division) => ({ value: division.id, label: division.name }))}
          onValueChange={(divisionId) => onChange({ divisionId, districtId: null, upazilaId: null })}
        />

        <Select
          label="District"
          placeholder={value.divisionId ? 'Select district' : 'Select division first'}
          value={value.districtId ?? ''}
          disabled={!value.divisionId || districts.length === 0}
          options={districts.map((district) => ({ value: district.id, label: district.name }))}
          onValueChange={(districtId) => onChange({ ...value, districtId, upazilaId: null })}
        />

        <Select
          label="Upazila"
          placeholder={value.districtId ? 'Select upazila' : 'Select district first'}
          value={value.upazilaId ?? ''}
          disabled={!value.districtId || upazilas.length === 0}
          options={upazilas.map((upazila) => ({ value: upazila.id, label: upazila.name }))}
          onValueChange={(upazilaId) => onChange({ ...value, upazilaId })}
        />
      </div>
    </div>
  );
}
