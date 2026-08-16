# Phase 2.8 — Shipping & Fulfillment, Slice 2: Fulfillment Workflow

**Date:** 2026-08-16
**Scope:** Warehouse operations — the real Pick/Pack/Dispatch/In-Transit/Deliver/Fail/Cancel workflow, against the real, already-complete backend (`app/Domains/Operations/Fulfillment`), continuing from the approved `PHASE_2_8_SHIPPING_ARCHITECTURE.md` and Shipping Slice 1. Admin Shell, Navigation, Authentication, Shared Design System, Backend, Database, Routes, Permissions, and API contracts were **not modified**. **Not committed, not pushed** — awaiting Product Owner approval.

---

## 1. Backend capabilities consumed

- **`ShipmentWorkflowController`** — all 9 real transition endpoints: `pick/start`, `pick/complete`, `pack/start`, `pack/complete`, `dispatch`, `in-transit`, `deliver`, `fail`, `cancel`. Every request shape confirmed against its own `Http\Requests` class (`ExpectedVersionRequest`, `DispatchShipmentRequest`, `MarkFailedRequest`, `CancelShipmentRequest`) before wrapping it.
- **`Models\Shipment::ALLOWED_TRANSITIONS`** — read directly and mirrored client-side exactly (not re-derived from guesswork) to decide which button to ever offer: `pending→{picking,cancelled}`, `picking→{picked,failed,cancelled}`, `picked→{packing,cancelled}`, `packing→{packed,failed,cancelled}`, `packed→{dispatched,cancelled}`, `dispatched→{in_transit,delivered,failed}`, `in_transit→{delivered,failed}`.
- **Real backend preconditions**, checked client-side before a button is even clickable, never invented: `StartPickingAction`'s `no_items` guard, `MarkPackedAction`'s `missing_weight` guard, `DispatchShipmentAction`'s `missing_destination` guard.
- **`fulfillment.shipments.{pick,pack,dispatch,cancel}`** — Fulfillment's own granular, least-privilege permissions, each gating its own group of buttons via `RequirePermission`, confirmed live with a real, narrower "picker-only" session.
- **`DispatchShipmentAction`'s dual dispatch path** — courier-booked vs. manual tracking number, exactly as the backend implements it; no courier credentials are configured in this environment (re-confirmed live), so every real dispatch in this slice exercised the manual-tracking-number path — the real, backend-accepted override, not an invented one.
- **Real `ShipmentTimelineEvent` and Fulfillment `AuditLog` rows** — every workflow action's own real timeline description and audit action string (e.g. `shipment.picking_started`, `shipment.dispatched`) surfaced verbatim, no fabricated entries.
- **`ConcurrencyConflictException` (409)** and **`ShipmentValidationException` (422)** — both mapped through the existing `shippingErrorMessage` error mapper from Slice 1, extended with no new logic (the same generic 409 wording already covers this module).

## 2. Features completed

1. **Shipment Workflow action bar** (`ShipmentWorkflowActions.tsx`) — one button per genuinely reachable next transition, gated by the exact real permission each endpoint requires. A picker-only session sees Pick actions and nothing else — live-verified with a real, narrower role.
2. **Status Progression rail** (`ShipmentStatusRail.tsx`) — Pending → Picked → Packed → Dispatched → Delivered, current stage highlighted, completed stages checked. Failed/Cancelled are shown as a separate banner (matching Slice 1's existing "Fulfillment failed" treatment, now extended to Cancelled too) rather than additional rail stops, since they're real branch transitions reachable from several points, not sequential stages.
3. **Dispatch Experience** (`ShipmentDispatchDialog.tsx`) — an optional real Shipping Method picker (Slice 1's own `useAllShippingMethods`) and a tracking-number field going straight to the real `tracking_number` param. No invented tracking number, tracking URL, courier API, or booking flow.
4. **Fail** (`ShipmentFailDialog.tsx`, required reason) and **Cancel** (`ShipmentCancelDialog.tsx`, optional reason) dialogs, mirroring Orders' own `OrderCancelDialog` pattern.
5. **Permission-respecting, real optimistic locking** — every mutation threads `expected_version`; a real 409 is caught and surfaced with the same "changed elsewhere, reload" wording every other module uses.
6. **Timeline** — unchanged from Slice 1, now populated by real events from every real transition exercised.
7. **Audit usability improvement** — Fulfillment Audit Log rows (and whole rows) now navigate straight to the real Shipment they reference, using data the endpoint already returns; no `action`-type filter was added, since the real backend supports none.

## 3. Bugs found

**One real, minor copy bug**, found during live verification: the Courier "Provider" field read `courierProviderCode ?? 'Self-fulfilled / not yet dispatched'` — technically accurate before dispatch, but misleading once a shipment had genuinely been dispatched via the manual/self-fulfilled path (a real, common case in this environment, since no courier has live credentials). The label kept saying "not yet dispatched" on an already-`dispatched` shipment.

## 4. Bugs fixed

The label above now reads `courierProviderCode ?? (dispatchedAt ? 'Self-fulfilled' : 'Not yet dispatched')` — distinguishing "no courier, hasn't shipped" from "no courier, shipped self-fulfilled" using data already on the resource. Re-verified live after the fix.

No other frontend defects were found. The full happy path (Pending → Picking → Picked → Packing → Packed → Dispatched → In Transit → Delivered) and the Cancel path were both exercised against the real backend without incident.

## 5. Honest backend limitations

Restated and re-confirmed live, per this slice's own explicit "do not build" boundary ("Shipment editing"):

1. **No item management UI.** `StartPickingAction` requires at least one item; this admin cannot add one. A shipment with none genuinely cannot be picked from this UI — `Start Picking` is shown, correctly disabled, with the real reason stated inline.
2. **No destination/weight-setting UI.** `MarkPackedAction` requires a recorded weight and `DispatchShipmentAction` requires a destination; both are set only via `PATCH .../destination`, not built this slice. `Mark Packed` and `Dispatch` are shown correctly disabled with the real reason when either precondition is unmet.
3. **Consequence**: as shipped, this admin can run the full workflow **only on a shipment that already has items, weight, and a destination** — none of which any real merchant workflow in this release can set. Every real shipment auto-created by `OrderPlaced` today starts with none of the three. This is a genuine, load-bearing gap for real adoption, not a cosmetic one — flagged here explicitly, not worked around, exactly as instructed. **Recommend Slice 3 (or a fast-follow) add, at minimum, Destination + Item entry** — both real, already-existing backend endpoints (`SetShipmentDestinationAction`, `AddShipmentItemAction`) that this slice deliberately did not wrap.
4. **No live courier in this environment.** Every dispatch exercised (live and in tests) used the manual tracking-number path; the courier-booked path (`ProviderRegistry`/`bookShipment()`) is real, wired, and unit/e2e-mocked, but cannot be live-verified here since no provider reports `isAvailable()`.
5. **No tracking sync, no tracking page, no delivery-confirmation API** — none exist in the backend; none were built.

## 6. Desktop screenshots

Captured against the real backend at 1440×900 — sent alongside this report: pending shipment ready to pick (real seeded item/weight/destination), picking, packed, dispatched (with real manual tracking number), delivered (final state, rail fully checked), Fulfillment Audit Log (real entries), cancelled (with real reason).

## 7. Mobile screenshots

Captured at 390×844 — delivered Shipment Detail with the status rail correctly reflowing to a compact, dense layout, matching Slice 1's own responsive baseline.

## 8. Quality gate results

| Gate | Result |
|---|---|
| `typecheck` | Clean (admin, api-client, tokens, ui) |
| `lint` | Clean (admin, ui) |
| Production `build` | Clean |
| Unit tests | **283 passing** (133 admin + 134 api-client + 16 ui) — 10 new this slice, all in `packages/api-client/src/fulfillment/workflow.test.ts` (one per real endpoint, including the omit-empty-fields behavior for Dispatch and Cancel) |
| Playwright e2e | **19/19 passing** for this module (11 Slice 1 + 8 new this slice: no-items-disabled, full happy path, fail/cancel reason handling, dispatch-precondition-disabled, real 409 handling, picker-only permission gating, a11y). Full suite: 131/136 passing — the 5 failures are the same pre-existing `catalog-brands.spec.ts`/`catalog-product-slice2.spec.ts` baseline flakiness this engagement has tracked since Phase 2.2, reconfirmed unrelated (zero Catalog files touched) |
| Accessibility | 0 critical/serious violations on Shipment Detail mid-workflow |
| Responsive | Verified at 390×844 and 1440×900 |
| Live verification | **24/24 automated checks passing** against the real backend — full real pick→pack→dispatch→in-transit→deliver run, real cancel run, real audit cross-navigation, zero console errors |

## 9. Readiness score: 90/100

The ten points held back are almost entirely the one real, load-bearing gap in §5.3: this workflow cannot be exercised by a real merchant on a real, freshly-auto-created shipment today, since no in-app way exists yet to give that shipment items or a destination. The workflow logic itself — transitions, permissions, optimistic locking, dispatch handling, audit, timeline — is complete, correct, and live-verified end-to-end with no defects found beyond the one cosmetic label bug (fixed).

**Recommendation: READY for the workflow mechanics themselves, but flag §5.3 to the Product Owner as the decision that determines whether this is usable by real warehouse staff before a Slice 3 (or amendment) adds Destination + Item entry.**

---

**Not committed. Not pushed. Stopping here per the instruction's own closing line, awaiting Product Owner approval.**
