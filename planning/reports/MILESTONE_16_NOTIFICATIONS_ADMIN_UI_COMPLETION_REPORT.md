# Milestone 16 — Notifications Admin UI — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`, verified against the actual repository per the standing instruction. Not a planned milestone — the Notifications domain's backend (`app/Domains/Operations/Notifications`) has been real and complete since Milestone 3, and the Gateway/Storefront side (customer-facing delivery) has been live since then too, but no Admin UI ever existed for it: no way for a merchant to see what was sent, retry a failure, cancel a pending send, or manage the templates that decide what a notification actually says. Scoped by reading the real backend directly (routes, requests, resources, actions) rather than assuming — no backend changes were needed, every capability this milestone exposes already existed.

## Part 0 — What Was Found (Re-Confirmed, Not Assumed)

Read `app/Domains/Operations/Notifications/` directly before writing anything:
- `routes.php` — real routes for `notification-templates` (index/store/show/update — no delete), `notifications` (index/store/show), `notifications/{id}/retry` and `/cancel`, `notification-audit-logs`, `notification-providers`.
- `Http/Requests/{CreateNotificationTemplateRequest,UpdateNotificationTemplateRequest}.php` — create requires `code`/`channel`/`body`, `locale` defaults server-side (`NotificationTemplate::booted()`); update only allows `subject`/`body`/`is_active`/`expected_version` — `code`/`channel`/`locale` are immutable after creation.
- `Http/Controllers/{NotificationController,NotificationWorkflowController}.php` — `retry()` takes a plain `Request` with **no** `expected_version` check (only `cancel()` is optimistic-locked); real server-side `status`/`channel` filters on the list; `related_type`+`related_id` is a real filter pair, not a top-level column a merchant would type into search.
- `Http/Resources/{NotificationResource,NotificationDeliveryAttemptResource}.php` — confirmed `NotificationResource` never exposes the rendered `body`/`subject` that was actually sent, only delivery-status metadata; `show()` is the only endpoint that includes `deliveryAttempts`.
- `Actions/{RetryNotificationAction,CancelNotificationAction}.php` — real preconditions: retry requires `status === STATUS_FAILED`; cancel transitions from `pending`/`queued` only.
- `Models/NotificationTemplate.php` — real `CHANNELS = [email, sms, whatsapp, in_app]`.
- Every Notifications Action's real audit action strings (`notification_template.created`, `notification_template.updated`, `notification.queued`, `notification.sent`, `notification.failed`, `notification.retry_scheduled`, `notification.retry_requested`, `notification.cancelled`).

**Classification**: **Backend fully implemented, Admin UI absent** — a straightforward "expose what already exists" milestone, following Reviews' (Milestone 13) exact shape.

## Part 1 — What Shipped

- `packages/api-client/src/notifications/`: `types.ts` (added `NotificationDeliveryAttemptDTO`, made `NotificationDTO.deliveryAttempts` required, added template/audit-log/cancel types), new `templates.ts` (list/get/create/update — update never sends `code`/`channel`/`locale`), new `workflow.ts` (`getNotification`, `retryNotification` with no body, `cancelNotification`), new `auditLogs.ts` (`listNotificationsAuditLogs`, distinct `/notification-audit-logs` path). 10 new tests.
- `apps/admin/src/modules/notifications/` (new module):
  - `shared/{errors.ts,queries.ts,auditAction.ts}` — `humanizeAuditAction` mapping the 8 real action strings above; `auditAction.test.ts` covers every one plus a generic fallback for an unmapped future action.
  - `activity/NotificationsAuditLogPage.tsx` — mirrors Reviews'/Returns' own Activity page pattern exactly, Type filter offers Notification/Template.
  - `templates/{NotificationTemplateFormDialog.tsx,NotificationTemplatesListPage.tsx}` — react-hook-form + zod create/edit dialog (`code`/`channel`/`locale` disabled when editing, matching the backend's own immutability rule); list has a debounced (350ms) server-side `q` search (the same `useDebouncedValue` pattern already applied in Orders List and, before that, found and fixed in Customers' Freeze Audit) and a channel filter; row actions are Edit and Activate/Deactivate — no fabricated "Delete," since no delete endpoint exists.
  - `log/{NotificationsListPage.tsx,NotificationDetailPage.tsx}` — status/channel filters; Retry shown only when `status === 'failed'`; Cancel (via `ConfirmDialog`) shown only when `status === 'pending' | 'queued'`; Detail page adds the real Delivery Timeline from `deliveryAttempts` and explicitly does not show any rendered message content, since the backend genuinely never returns it.
  - `module.ts` — registers `notifications/log`, `notifications/log/:id`, `notifications/templates`, `notifications/activity` and the nav entry; registered in `apps/admin/src/modules/index.ts`.

## Part 1.5 — A Real Bug Found and Fixed During Live Verification (Platform-Wide)

Live-verifying the Notifications list's Cancel action, confirming "Cancel notification" force-navigated to that row's Detail page immediately after the cancel succeeded — reproduced twice, on two different rows, cleanly (not a one-off click artifact).

**Root cause**: `ConfirmDialog`'s `DialogContent` renders via a React portal (`RadixDialog.Portal`), so its DOM parent is outside the table row entirely — but React re-dispatches synthetic events by walking the *component* tree, not the DOM tree. `ConfirmDialog`'s footer "Cancel notification"/"Cancel" buttons never called `stopPropagation()`, so a click on either one still bubbled — through the portal boundary — up to the enclosing `DataTable` row's own `onClick`, firing `onRowClick` right after the mutation succeeded. The row's trigger button already called `stopPropagation()` on its own click, but that does nothing for a *separate* click on a different button rendered later, inside the portal.

Since `ConfirmDialog` is the platform's one shared destructive-confirmation component, this reproduces on **every** list page across the app that combines a `DataTable` row with `onRowClick` and a `ConfirmDialog` action — not only Notifications. Fixed at the root, in three shared `packages/ui` / `apps/admin` framework files rather than patched per call site:

- `apps/admin/src/framework/ConfirmDialog.tsx` — both footer buttons now `stopPropagation()`.
- `packages/ui/src/components/Dialog/Dialog.tsx` — the same fix applied to `DialogContent`'s own built-in `Overlay` and `Close` (X) button, the identical mechanism for any `Dialog` (not just `ConfirmDialog`) nested inside a clickable row.
- `packages/ui/src/components/DropdownMenu/DropdownMenu.tsx` — the same fix applied pre-emptively to `DropdownMenuItem`/`CheckboxItem`/`RadioItem`, the identical portal-bubbling mechanism. Not yet reproduced on a shipped page (no current list page combines a row-action `DropdownMenu` with `DataTable`'s `onRowClick`), but closed off before the next module that does combine them can rediscover it.

Added `apps/admin/src/framework/ConfirmDialog.test.tsx` — a regression test reproducing the exact composition (a `DataTable` row with `onRowClick`, wrapping a `ConfirmDialog`), not `ConfirmDialog` in isolation, since isolation is exactly what let this ship unnoticed.

## Part 2 — Verification

| Check | Result |
|---|---|
| `api-client` typecheck/tests | Clean, 10 new tests |
| `packages/ui` typecheck/lint/tests | Clean, 16/16 (no regressions from the Dialog/DropdownMenu fix) |
| Admin typecheck | Clean |
| Admin lint | Clean |
| Admin unit tests | **171/171** (6 new: 4 `auditAction`, 2 `ConfirmDialog` regression) |
| Admin production build | Clean |

### Live, end-to-end verification (real backend + real Admin + real browser)
Logged into the real Admin UI as a temporary, purpose-created staff account (`qa-verify-milestone16@nexgen.test`, cleaned up afterward via Tinker). Confirmed against real data:
- **Templates**: all 12 real templates listed (code/channel/locale/subject/status); edited `checkout.abandoned`'s subject, saved, confirmed it persisted, reverted it; Deactivated then Activated the same template, confirming the row-menu label and badge both update correctly; created a real template (`qa.milestone16.test`), confirmed it appeared active, then Deactivated it (no delete endpoint exists, so left inactive rather than orphaned).
- **Notifications log**: ~90 real notifications across 6 pages of real customer/order/return/payment activity; Cancelled two real (long-stale, still-queued) test notifications from the list — **after the fix**, confirmed both stayed on the list with the status badge updating to "cancelled" in place, no navigation.
- **Notification Detail**: opened via a genuine row click (confirming `onRowClick` itself works correctly for its real purpose), Overview grid and Delivery Timeline both render real data; a cancelled notification correctly shows its `Cancelled` timestamp and no Actions card.
- **Notifications Activity**: real audit trail, correctly humanized (`Cancelled`, `Template updated`, `Notification queued`) and attributed (`QA Verify Milestone16` for manual actions, `System` for the queue's own automated `notification.queued` entries), correct target types and real ids.

## Part 3 — Final Classification

**Production ready.** Ships the last Admin-UI gap in an otherwise-complete backend domain, and closes a real, reproducible, platform-wide UX bug (unexpected navigation after a destructive-action confirm) found and fixed at its root during this milestone's own live verification — before it could affect any other module's list page.

## Part 4 — Roadmap Correction

Added to `PRODUCTION_COMPLETION_PLAN_v2.md` as Milestone 16.

---
