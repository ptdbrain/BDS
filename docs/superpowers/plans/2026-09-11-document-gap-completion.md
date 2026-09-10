# AHS Document Gap Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining Google Doc requirements for transaction sequencing, employee ownership, draft handoff, report UX, and role-safe data access.

**Architecture:** Keep the existing Next.js/Prisma architecture. Add small policy helpers for ownership and draft visibility, enforce them in API routes, then align the page and workbench components with the same policies. Preserve the existing sequential booking helper and explicit financial-field policy.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma/SQLite, Node test runner, ExcelJS.

## Global Constraints

- Latest tab 8 rules override older conflicting menu descriptions.
- Product labels are exactly `Còn hàng`, `Đang lock`, and `Đã bán` for the active website states.
- Booking matching windows are ten minutes and the next booking starts at the previous booking's end.
- Only `MANAGER` views company revenue; only `SALES_ADMIN` edits DoanhThu, HoaHong, and TrangThaiHoaHong.
- Do not authorize behavior from localStorage or client-only state.
- Do not add PDF export; preserve formatted `.xlsx` export and date filtering.
- Keep unrelated files and existing data/assets unchanged unless a task explicitly names them.

### Task 1: Encode ownership and draft-visibility policies

**Files:**
- Modify: `src/lib/rolePolicy.ts`
- Modify: `src/lib/bookingQueue.ts`
- Modify: `src/lib/contractFinancialPolicy.ts`
- Test: `scripts/tests/role-booking-status.test.mjs`
- Test: `scripts/tests/booking-approval.test.mjs`

**Interfaces:**
- Add `canSalesActOnBooking(role, actorId, bookingSalesEmployeeId): boolean`.
- Add `canOpenCustomerHandoff(role, paymentStatus): boolean`.
- Add `isSubmittedCustomerStatus(status): boolean`.
- Add `isSubmittedContractStatus(status): boolean`.

- [ ] **Step 1: Write failing tests**

```js
assert.equal(canSalesActOnBooking('SALES', 'sales-1', 'sales-1'), true);
assert.equal(canSalesActOnBooking('SALES', 'sales-2', 'sales-1'), false);
assert.equal(canSalesActOnBooking('SALES_ADMIN', 'admin-1', 'sales-1'), false);
assert.equal(isSubmittedCustomerStatus('DRAFT'), false);
assert.equal(isSubmittedCustomerStatus('PENDING_VERIFICATION'), true);
```

- [ ] **Step 2: Run the focused tests and confirm the expected missing-export failure**

Run: `node --experimental-strip-types --test scripts/tests/role-booking-status.test.mjs scripts/tests/booking-approval.test.mjs`

Expected: FAIL because the new policy exports do not exist yet.

- [ ] **Step 3: Implement the minimal policy helpers**

Use normalized roles and exact employee IDs. Treat `DRAFT` customers/contracts as not submitted; treat `PENDING`, `PENDING_REVIEW`, `CHANGE_REQUESTED`, `APPROVED`, `SIGNED`, and equivalent submitted states as submitted.

- [ ] **Step 4: Run focused tests**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rolePolicy.ts src/lib/bookingQueue.ts src/lib/contractFinancialPolicy.ts scripts/tests/role-booking-status.test.mjs scripts/tests/booking-approval.test.mjs
git commit -m "fix: encode booking ownership policy"
```

### Task 2: Enforce lock and booking workflow at API boundaries

**Files:**
- Modify: `src/app/api/v1/locks/[id]/confirm-payment-sales/route.ts`
- Modify: `src/app/api/v1/locks/[id]/confirm-transfer/route.ts`
- Modify: `src/app/api/v1/bookings/[id]/match-unit/route.ts`
- Modify: `src/app/api/v1/bookings/route.ts`
- Modify: `src/app/api/v1/customers/route.ts`
- Modify: `src/app/api/v1/contracts/route.ts`
- Modify: `src/app/api/v1/contracts/[id]/route.ts`
- Modify: `src/app/api/v1/contracts/[id]/request-changes/route.ts`
- Test: `scripts/tests/booking-approval.test.mjs`
- Test: `scripts/tests/contract-financial-policy.test.mjs`

**Interfaces:**
- Lock confirmation returns a draft handoff without creating a submitted verification.
- Matching rejects non-owner Sales with HTTP 403 and rejects non-Sales actors.
- Customer GET accepts `role` and `employeeCode` and excludes unsubmitted drafts from review scopes.
- Contract GET returns only the current Sales employee's contracts for `SALES`.

- [ ] **Step 1: Add failing API-policy tests**

Cover: Sales cannot match another Sales employee's booking; Product Admin cannot match; a draft customer is not submitted; request-changes requires Sales Admin or Manager.

- [ ] **Step 2: Run tests and confirm they fail against current routes**

Run: `npm test`. Expected: the new assertions fail before route/helper changes.

- [ ] **Step 3: Enforce matching ownership and lock sequencing**

Require the actor role/ID at the endpoint, keep Sales confirmation at `PAYMENT_PENDING`, allow transfer confirmation only after Sales confirmation, and return the associated draft contract for the owner handoff.

- [ ] **Step 4: Stop placeholder leakage and scope queries**

Create placeholders with `DRAFT` state and stable transaction-specific values. Filter customer and contract responses by role/employee. Only Sales submission creates `PENDING_VERIFICATION`.

- [ ] **Step 5: Authorize request-change endpoint**

Require `actorRole` to be `SALES_ADMIN` or `MANAGER`; resolve the reviewer from the supplied identity and persist the reason.

- [ ] **Step 6: Run API-policy tests and full tests**

Run: `npm test`. Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/v1/locks src/app/api/v1/bookings src/app/api/v1/customers/route.ts src/app/api/v1/contracts scripts/tests
git commit -m "fix: enforce transaction ownership"
```

### Task 3: Align UI handoffs and role controls

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/LockManager.tsx`
- Modify: `src/components/InventoryMatrix.tsx`
- Modify: `src/components/CustomerManager.tsx`
- Modify: `src/components/ContractWorkflow.tsx`
- Modify: `src/components/ComprehensiveContractModal.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Sales payment confirmation does not navigate to customer entry.
- Sales Admin confirmation hands the owning Sales employee to the full contract form.
- Only the assigned Sales account sees/enables the booking match action.
- Product Admin sees booking data read-only and has no booking create/edit controls.

- [ ] **Step 1: Add a regression test for the handoff policy**

Assert the policy used by UI handlers: a `PAYMENT_PENDING` lock is not a customer-submission trigger; a `DEPOSIT_CONFIRMED` lock is.

- [ ] **Step 2: Run the regression test and verify it fails**

Run: `npm test`. Expected: the new handoff assertion fails against the current handler policy.

- [ ] **Step 3: Add an owner-scoped contract handoff state**

Pass the draft contract/product from the confirmed lock to the contract workbench and open the full form for the owning Sales account. Keep a customer-list fallback only for Sales Admin/Manager review.

- [ ] **Step 4: Remove premature customer navigation and restrict controls**

Remove the Sales-side navigation from `handleSalesConfirmPayment`. Hide booking create/edit controls for Product Admin and ensure the booking approve button is only Sales Admin/Manager.

- [ ] **Step 5: Normalize report menu copy**

Use `Báo Cáo` for both Product Admin and Manager sidebar/report entry labels.

- [ ] **Step 6: Run typecheck and tests**

Run: `npm test` and `npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/LockManager.tsx src/components/InventoryMatrix.tsx src/components/CustomerManager.tsx src/components/ContractWorkflow.tsx src/components/ComprehensiveContractModal.tsx src/components/Sidebar.tsx
git commit -m "fix: align role workflow handoffs"
```

### Task 4: Remove PDF export and preserve report export behavior

**Files:**
- Modify: `src/components/ReportsDashboard.tsx`
- Modify: `src/components/ContractWorkflow.tsx`
- Modify: `src/components/ComprehensiveContractModal.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `scripts/tests/role-booking-status.test.mjs`

**Interfaces:**
- Reports export remains `.xlsx` via ExcelJS with formatted cells.
- Contract and report UI expose no PDF action or `jspdf` dependency.

- [ ] **Step 1: Add a static regression assertion**

Read the named UI sources in the Node test and assert no visible PDF export handler/button and no `jspdf` import remains.

- [ ] **Step 2: Run the assertion and confirm it fails**

Run: `npm test`. Expected: FAIL because the current contract components still import/use `jspdf`.

- [ ] **Step 3: Remove PDF actions and dependency**

Delete only the PDF handlers/buttons/imports and uninstall `jspdf`; keep ExcelJS export and date filter code.

- [ ] **Step 4: Rename report labels**

Change visible report titles/tabs to the exact `Báo Cáo` wording while retaining internal report keys.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test` and `npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ReportsDashboard.tsx src/components/ContractWorkflow.tsx src/components/ComprehensiveContractModal.tsx package.json package-lock.json scripts/tests/role-booking-status.test.mjs
git commit -m "fix: remove PDF report actions"
```

### Task 5: Verify the complete system

**Files:**
- No source changes unless verification exposes a regression.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`.

- [ ] **Step 2: Run static and schema checks**

Run: `npx tsc --noEmit` and `npx prisma validate`.

- [ ] **Step 3: Run the production build**

Run: `npm run build`.

- [ ] **Step 4: Run the local API smoke journey**

Verify: Sales lock confirmation stays pending; Sales Admin confirmation sells and returns a draft; booking approval creates the next ten-minute row; wrong Sales ownership returns 403; Product Admin report is limited; Manager report includes company revenue.

- [ ] **Step 5: Check the diff and working tree**

Run: `git diff --check` and `git status --short --branch`.
