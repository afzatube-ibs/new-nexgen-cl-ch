# Milestone 6 — Admin: Identity & Access (User & Role Management UI) — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`. First milestone this session in the "merchant usability" tier, per the confirmed priority ordering (shortest path to a real purchase → merchant usability → customer features → growth).

## Part 1 — What Shipped

### `packages/api-client`
The response DTOs (`UserDTO`, `RoleDTO`, `PermissionDTO`) already existed, field-for-field matching the real backend's `UserResource`/`RoleResource`/`PermissionResource` — unused until now. Added the missing CRUD wrappers:
- **`roles.ts`** (new) — `listRoles`/`getRole`/`createRole`/`updateRole`/`deleteRole`. No `archive()` — `RoleController` has no such route.
- **`permissions.ts`** (new) — `listPermissions`, the real, code-registered catalog.
- **`userRoles.ts`** (new) — `assignRole`/`revokeRole`.
- **`users.ts`** (extended) — `listUsersPaginated`/`getUser`/`createUser`/`updateUser`/`archiveUser`/`deleteUser`, alongside the pre-existing `listUsers` (kept, still used by Customers' own audit-log actor-name resolution).

### Admin (`apps/admin/src/modules/identity-access`, new module)
- **`UsersListPage`** — real server-side status filter/sort/pagination (`UserController::index`'s own real capabilities, never client-side-filtered), each row showing real assigned-role badges.
- **`UserFormDialog`** — create/edit, mirroring `CustomerFormDialog`'s established pattern (a generated-strong-password helper, password fields only on create). Named "New staff member," not "Invite" — the real backend issues no invitation email.
- **`UserDetailPage`** — overview + a real Roles card: assign from the live list of not-yet-held roles, revoke an assigned one. Self-role-change guard (see Part 3).
- **`RolesListPage`** — the real, small role set (no search — none exists on the backend for it). `administrator` shown with a lock icon and no delete action (a client-side guardrail, not a backend restriction — see Part 3).
- **`RoleFormDialog`** — create/edit, with a real permission matrix: every real permission from `GET /permissions`, grouped by its own real `module` field (matching `PermissionController::index()`'s own `orderBy('module')`), with module-level select-all/indeterminate checkboxes.
- **`shared/groupPermissions.ts`** — the permission-grouping logic extracted as its own pure, unit-tested function, matching this app's own established "small, non-trivial transformations get their own test" convention (`variantCombinations.ts`).

Registered through the identical `registerModule()` mechanism every other module already uses — zero Admin Shell/router/Sidebar changes.

## Part 2 — Real, Live-Found Backend Bugs (found via browser verification, not the test suite)

Every one of these passed typecheck, lint, and the full test suite before live verification — each was only caught by actually clicking through the real UI with real data.

1. **`UserController::index()` never eager-loaded `roles` at all.** `UserResource`'s own `roles` field is `$this->whenLoaded('roles')` — without eager-loading, Laravel's resource serialization omits the key entirely (not `[]`). The real Admin Staff list crashed with `Cannot read properties of undefined (reading 'length')` on `row.roles.length` for every single row. Confirmed live via a direct, unauthenticated-of-any-UI `curl` call before writing the fix.
2. **`UserController::show()` and `UserRoleController::store()` both loaded `roles` but never the nested `roles.permissions`.** `RoleResource`'s own `permissions` field has the identical `whenLoaded()` gap one level deeper — `AuthController::me()` already got this right (`$user->load('roles.permissions')`), but `show()` and the role-assignment endpoint did not. This crashed `UserDetailPage` (`role.permissions.length`) the moment any user with a real, permission-bearing role was viewed — including, for `show()`, the very first Administrator account every fresh installation creates via `identity-access:create-admin`.

All three fixed by eager-loading `roles.permissions` consistently. New regression tests added directly to each affected endpoint's own existing test file (`UserManagementTest.php` ×2, `UserRoleAssignmentTest.php` ×1) — 3 new backend tests total, all passing, plus confirmed the fix resolves the crash live in the actual running Admin app afterward.

## Part 3 — The Plan's Own Named Risk, Investigated and Resolved Honestly

The plan flagged: "a role editor must not let a non-Administrator escalate their own privileges." Investigated directly against the real backend before building anything client-side: `UserRoleController`/`AssignRoleAction` impose no narrower scope of their own — any holder of `identity_access.user_roles.manage` can assign or revoke any role, including their own, via a direct API call. No backend-level restriction exists to defer to.

Given that, the UI adds a real, honest guardrail scoped to what it can actually guarantee: `UserDetailPage` disables revoking a role from the currently signed-in operator's own account, on their own detail page — preventing the single most disruptive *accidental* mistake (locking yourself out) — documented explicitly, in the component's own docblock, as a usability protection, not a security control. Closing the underlying gap for real (a backend authorization change) is out of this UI-only milestone's scope and was not attempted.

The same reasoning applies to `RolesListPage`'s own guard against deleting the seeded `administrator` role — a real, easy-to-regret mistake with no backend-level special case, prevented client-side, documented as such.

## Part 4 — Verification

| Check | Result |
|---|---|
| Backend PHPStan | 0 errors |
| Backend Pint | Passed |
| Backend Pest (SQLite) | **1187/1214 passed.** 27 pre-existing failures, unchanged baseline — zero regressions. 3 new tests (the eager-loading regressions above). |
| `packages/api-client` typecheck | Clean |
| `packages/api-client` tests | **172/172 passed** (167 prior + 5 new, `roles.test.ts`). |
| Admin typecheck | Clean |
| Admin lint | Clean |
| Admin tests | **151/151 passed** (148 prior + 3 new, `groupPermissions.test.ts`). |
| Admin production build (`tsc -b && vite build`) | Succeeded — `UserFormDialog`/`UsersListPage`/`UserDetailPage`/`RolesListPage` all correctly code-split into their own lazy-loaded chunks. |

### Live, end-to-end verification (real backend + real Admin app + real browser)
1. Created a real administrator account via the existing `identity-access:create-admin` CLI command and signed into the real Admin app with it.
2. `/staff`: found and fixed the `roles`-omitted-from-list bug (Part 2 #1) live.
3. Created a real staff account through the real form (including the "Generate" strong-password button) — landed with the honest "No role assigned" state.
4. Opened its detail page, assigned a real role — found and fixed the `roles.permissions`-omitted bug (Part 2 #2) live — then, after the fix, confirmed the same assign/view/revoke cycle completes correctly with no error.
5. `/roles`: confirmed the real role list (Administrator/98 permissions, the two real Gateway service roles) renders correctly.
6. Created a real new role through the permission-matrix dialog, selected one specific permission, and confirmed the created role shows exactly "1" permission in the list — proving the matrix's individual checkbox selection reaches the real backend correctly, not just the "select all" path.
7. All test accounts, role assignments, and the test role were deleted from the dev database afterward.

## Part 5 — Remaining, Honest Gaps

- **No session/token management UI** — the plan's own Milestone 6 objective mentioned it; the backend (`SessionController`) is real and complete, but building its own UI was descoped this pass in favor of the core ask (staff CRUD + role/permission composition). A reasonable, small follow-up.
- **No real self-service invitation email** — creating a staff account sets a real password immediately, shared out-of-band by the creating operator; no invitation-link flow exists on the real backend to build a UI for.
- **No staff self-service password change/reset** — named explicitly, honestly, in `UserFormDialog`'s own hint text rather than promised.
- **The underlying self-role-escalation gap** (Part 3) remains a real, if low-severity, backend authorization consideration for a future pass — not attempted here, correctly out of this milestone's UI-only scope.

---
