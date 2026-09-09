# AHS Role, Commission, Product Status, and Booking Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Enforce Sales Admin-only financial updates, Manager read-only access, canonical product labels, and sequential booking turns after transaction confirmation.

**Architecture:** Add small pure helpers for role policy, product display status, and ten-minute booking windows. Reuse them in the existing contract/report/product/booking routes and role-aware React screens. Extend Booking with confirmation/idempotency metadata so approval creates exactly one follow-up booking without changing product status.

**Tech Stack:** Next.js 14 App Router, TypeScript, React, Prisma 5 with SQLite, Node test runner, existing Tailwind UI.

## Global Constraints

- Preserve all unrelated existing and untracked workspace changes.
- SALES_ADMIN alone writes DoanhThu, HoaHong, and TrangThaiHoaHong.
- MANAGER views those fields and the company revenue report but cannot edit them.
- PRODUCT_ADMIN sees only project/products and the project product-sales report.
- Website product labels are Còn hàng, Đang lock, and Đã bán.
- Booking approval schedules the next turn and never matches a product immediately.
- Do not use 5%/3% fallback values for missing company revenue or commission.

### Task 1: Add pure policy, status, and queue helpers with tests

**Files:**
- Create: src/lib/rolePolicy.ts
- Create: src/lib/productStatus.ts
- Create: src/lib/bookingQueue.ts
- Create: scripts/tests/role-booking-status.test.mjs
- Modify: package.json

**Interfaces:**
- canViewCompanyRevenue(role: string): boolean
- canEditCompanyFinancials(role: string): boolean
- canViewCommission(role: string, ownerEmployeeCode: string | undefined, viewerEmployeeCode: string | undefined): boolean
- getReportTabsForRole(role: string): string[]
- getCanonicalProductLabel(status?: string | null, legacyLabel?: string | null): string
- calculateNextBookingWindow(previousEnd: Date | null | undefined, projectLaunchTime: Date | null | undefined): { start: Date; end: Date }

- [ ] Step 1: Write the failing tests

    import test from 'node:test';
    import assert from 'node:assert/strict';
    import { canViewCompanyRevenue, canEditCompanyFinancials, getReportTabsForRole } from '../../src/lib/rolePolicy.ts';
    import { getCanonicalProductLabel } from '../../src/lib/productStatus.ts';
    import { calculateNextBookingWindow } from '../../src/lib/bookingQueue.ts';

    test('only Manager views company revenue and only Sales Admin edits financial fields', () => {
      assert.equal(canViewCompanyRevenue('MANAGER'), true);
      assert.equal(canViewCompanyRevenue('SALES_ADMIN'), false);
      assert.equal(canEditCompanyFinancials('SALES_ADMIN'), true);
      assert.equal(canEditCompanyFinancials('MANAGER'), false);
    });

    test('Product Admin receives only the project product-sales report tab', () => {
      assert.deepEqual(getReportTabsForRole('PRODUCT_ADMIN'), ['bc_sanpham_duan']);
    });

    test('legacy product labels normalize to the three website labels', () => {
      assert.equal(getCanonicalProductLabel('AVAILABLE', 'Check Admin'), 'Còn hàng');
      assert.equal(getCanonicalProductLabel('LOCKED', 'Đang giữ chỗ'), 'Đang lock');
      assert.equal(getCanonicalProductLabel('DEPOSITED', 'Đã cọc'), 'Đã bán');
    });

    test('next booking turn starts exactly at the previous end and lasts ten minutes', () => {
      const result = calculateNextBookingWindow(new Date('2026-09-10T17:10:00Z'), new Date('2026-09-10T17:00:00Z'));
      assert.equal(result.start.toISOString(), '2026-09-10T17:10:00.000Z');
      assert.equal(result.end.toISOString(), '2026-09-10T17:20:00.000Z');
    });

- [ ] Step 2: Run the tests and verify the expected RED failure

Run: node --experimental-strip-types --test scripts/tests/role-booking-status.test.mjs

Expected: FAIL because the three helper modules do not exist yet.

- [ ] Step 3: Implement the minimal helpers

Implement only the listed pure functions. Treat SOLD and DEPOSITED as Đã bán, LOCKED and legacy lock labels as Đang lock, and every available/check-admin value as Còn hàng. Reject missing or invalid booking start sources with an explicit error.

- [ ] Step 4: Run the tests and verify GREEN

Run: node --experimental-strip-types --test scripts/tests/role-booking-status.test.mjs

Expected: PASS with 4 tests.

- [ ] Step 5: Add the project test script

Add test:role-booking with value node --experimental-strip-types --test scripts/tests/role-booking-status.test.mjs to package.json without changing existing scripts.

### Task 2: Enforce financial-field permissions and remove fabricated values

**Files:**
- Modify: src/app/api/v1/contracts/route.ts
- Modify: src/app/api/v1/contracts/[id]/route.ts
- Modify: src/app/api/v1/contracts/[id]/approve/route.ts
- Modify: src/app/api/v1/reports/dashboard/route.ts
- Modify: src/components/ComprehensiveContractModal.tsx
- Modify: src/components/ContractWorkflow.tsx
- Create/modify: scripts/tests/contract-financial-policy.test.mjs

**Interfaces:**
- All financial mutations receive actorRole from the current user and reject non-Sales-Admin writes with HTTP 403.
- Contract GET responses hide doanhthu from non-Managers and hide commission fields from non-Managers, non-Sales-Admins, and non-owning Sales employees.
- Missing doanhthu/hoahong remains null; no route calculates a percentage fallback.

- [ ] Step 1: Write route/policy regression tests first

Cover these cases: Sales cannot write doanhthu or hoahong; Manager cannot write them; Sales Admin can write all three fields; a new Sales contract keeps missing financial values null; report totals sum entered revenue only; Product Admin response contains no commission data.

- [ ] Step 2: Run the focused tests and verify RED

Run: node --experimental-strip-types --test scripts/tests/contract-financial-policy.test.mjs

Expected: FAIL against the current fallback writes and Manager-as-Sales-Admin behavior.

- [ ] Step 3: Implement server-side permission handling

Normalize actorRole from the request body/header. In POST/PATCH/approve routes, accept doanhthu, hoahong, and commissionStatus only for SALES_ADMIN; preserve doanhso as the system-calculated sales value. Use presence checks rather than || so an intentional zero is not replaced. Sanitize GET and single-contract responses, including commissionStatus, trangthaiThanhtoan, and commissionDueDate when the viewer is not entitled.

- [ ] Step 4: Remove percentage fallback calculations

Change report calculations to sum explicit doanhthu and hoahong values only. Keep missing values null in contract creation and approval. Do not change the existing commissionStatus column; expose it in the UI as TrangThaiHoaHong.

- [ ] Step 5: Update contract UI roles

Make Sales Admin the only editable financial-field role. Render Manager values read-only, Sales owner commission read-only, and hide company revenue from Sales/Product Admin. Remove sensitive fields from Sales submit payloads so the API is not relying on client-side hiding. Rename the visible status label to Trạng Thái Hoa Hồng [TrangThaiHoaHong].

- [ ] Step 6: Run focused tests and verify GREEN

Run: node --experimental-strip-types --test scripts/tests/contract-financial-policy.test.mjs

Expected: PASS with all permission and no-fallback cases.

### Task 3: Implement idempotent sequential booking approval

**Files:**
- Modify: prisma/schema.prisma
- Modify: src/app/api/v1/bookings/[id]/approve/route.ts
- Modify: src/app/api/v1/bookings/[id]/match-unit/route.ts
- Modify: src/app/api/v1/bookings/route.ts
- Modify: src/lib/bookingHelper.ts
- Modify: src/components/LockManager.tsx
- Modify: src/components/InventoryMatrix.tsx
- Create/modify: scripts/tests/booking-approval.test.mjs

**Interfaces:**
- Add nullable Booking.depositConfirmedAt, Booking.depositConfirmedById, and unique nullable Booking.followUpBookingId.
- Approval returns currentBooking and nextBooking and is idempotent when depositConfirmedAt or followUpBookingId is already set.
- The next row uses sttBooking + 1, tgBatdaukhop equal to the previous booking end, and tgKetthuckhopcan equal to start plus ten minutes.

- [ ] Step 1: Write the failing booking tests

Test that a 17:00–17:10 booking approval leaves the current row waiting and creates one 17:10–17:20 row; test that a second approval creates no third row; test that matching a booking without confirmation metadata is rejected; test that approval does not update product status.

- [ ] Step 2: Run the focused tests and verify RED

Run: node --experimental-strip-types --test scripts/tests/booking-approval.test.mjs

Expected: FAIL because approval currently rewrites the current booking and matching does not require confirmation metadata.

- [ ] Step 3: Add the Prisma metadata and shared scheduling path

Add the three nullable booking fields, run npx prisma generate, and use calculateNextBookingWindow from the helper/route. Keep existing initial booking scheduling compatible with a project launch time and the previous scheduled end.

- [ ] Step 4: Rewrite approval as one transaction

Accept only CHO_DUYET_COC. If already confirmed, return the existing follow-up. Otherwise, find the highest project booking number, calculate the next window, create the new waiting row with no product mutation, update the current row with confirmation metadata while keeping CHO_KHOP, and link followUpBookingId. Record an audit log after the transaction.

- [ ] Step 5: Guard matching and fix action labels

Require depositConfirmedAt and the assigned time window before /match-unit can move a product to SOLD. Show the new row as waiting, remove the approval button from already-confirmed CHO_KHOP rows, and change copy that says approval activates or immediately matches a ten-minute turn.

- [ ] Step 6: Run focused tests and verify GREEN

Run: node --experimental-strip-types --test scripts/tests/booking-approval.test.mjs

Expected: PASS with sequential timing, idempotency, guard, and no-product-mutation cases.

### Task 4: Normalize website status and role-specific navigation

**Files:**
- Modify: src/lib/services/productState.ts
- Modify: src/lib/locks.ts
- Modify: src/lib/productHelper.ts
- Modify: src/app/api/v1/products/route.ts
- Modify: src/app/page.tsx
- Modify: src/components/Sidebar.tsx
- Modify: src/components/ReportsDashboard.tsx
- Modify: src/components/InventoryMatrix.tsx
- Modify: src/lib/authConfig.ts

- [ ] Step 1: Add failing UI/static behavior checks

Extend the helper test for every persisted status, and add a focused source-level test that Product Admin's report tab set excludes bc_doanhthu, bc_doanhso_nv, and kpi_dashboard.

- [ ] Step 2: Run the checks and verify RED

Run: npm run test:role-booking

Expected: FAIL on the legacy label and current Product Admin tab set.

- [ ] Step 3: Normalize backend status writes and reads

Update transitions, lock acquisition, product creation/import helpers, and product GET mapping to return Còn hàng, Đang lock, or Đã bán for the three user-facing states. Keep UNAVAILABLE as the existing non-sale state where needed, but never show Check Admin or Đang giữ chỗ for the three sale states.

- [ ] Step 4: Restrict navigation and prevent null report crashes

Set Product Admin's initial report tab to bc_sanpham_duan, hide inaccessible report tabs and export/company indicators, and make restricted report data safe when summary is null. Add a page-level guard for inaccessible tabs. Keep Manager's full report navigation and Sales Admin's no-company-report menu.

- [ ] Step 5: Run checks and verify GREEN

Run: npm run test:role-booking

Expected: PASS with canonical labels and role-specific tab checks.

### Task 5: Verify the combined change and preserve the dirty workspace

**Files:**
- Modify only files required by Tasks 1–4.

- [ ] Step 1: Run all focused tests

Run: npm run test:role-booking and the contract/booking focused test commands.

Expected: all tests pass.

- [ ] Step 2: Generate Prisma client and type-check/build

Run: npx prisma generate then npx tsc --noEmit and npm run build.

Expected: Prisma generation, TypeScript, and Next build complete without new errors.

- [ ] Step 3: Inspect the final diff and status

Run: git diff --stat, git diff --check, and git status --short.

Confirm the design/plan commits remain intact, unrelated dirty files are preserved, and no generated database/artifact files are staged.

- [ ] Step 4: Perform a manual API smoke check

With the local app running, verify: Sales Admin can update the three fields; Manager receives them read-only; Sales Admin cannot open company reports; Product Admin sees only the project report; approving booking 9 creates booking 10 at the previous end time; matching before confirmation/time fails.

- [ ] Step 5: Report any pre-existing failures separately

Do not repair unrelated baseline failures in this scope. Record the exact command and failure if one remains.
