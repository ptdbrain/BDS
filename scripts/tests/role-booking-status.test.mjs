import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  canViewCompanyRevenue,
  canEditCompanyFinancials,
  getReportTabsForRole,
  getNavigationTabsForRole,
  canSalesActOnBooking,
  canOpenCustomerHandoff,
  canSalesConfirmPayment,
  canConfirmLockTransfer,
  canApproveBooking,
  canRequestContractChanges,
  isSubmittedCustomerStatus,
  isSubmittedContractStatus
} from '../../src/lib/rolePolicy.ts';
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
  assert.deepEqual(getNavigationTabsForRole('PRODUCT_ADMIN'), ['inventory', 'reports']);
});

test('legacy product labels normalize to the three website labels', () => {
  assert.equal(getCanonicalProductLabel('AVAILABLE', 'Check Admin'), 'Còn hàng');
  assert.equal(getCanonicalProductLabel('LOCKED', 'Đang giữ chỗ'), 'Đang lock');
  assert.equal(getCanonicalProductLabel('DEPOSITED', 'Đã cọc'), 'Đã bán');
  assert.equal(getCanonicalProductLabel('SOLD', 'Đã khớp'), 'Đã bán');
});

test('next booking turn starts exactly at the previous end and lasts ten minutes', () => {
  const result = calculateNextBookingWindow(
    new Date('2026-09-10T17:10:00Z'),
    new Date('2026-09-10T17:00:00Z')
  );
  assert.equal(result.start.toISOString(), '2026-09-10T17:10:00.000Z');
  assert.equal(result.end.toISOString(), '2026-09-10T17:20:00.000Z');
});

test('only the assigned Sales employee can match a booking', () => {
  assert.equal(canSalesActOnBooking('SALES', 'sales-1', 'sales-1'), true);
  assert.equal(canSalesActOnBooking('SALES', 'sales-2', 'sales-1'), false);
  assert.equal(canSalesActOnBooking('SALES_ADMIN', 'admin-1', 'sales-1'), false);
  assert.equal(canSalesActOnBooking('MANAGER', 'manager-1', 'sales-1'), false);
});

test('customer handoff starts only after admin confirms the payment', () => {
  assert.equal(canOpenCustomerHandoff('SALES', 'PAYMENT_PENDING'), false);
  assert.equal(canOpenCustomerHandoff('SALES', 'DEPOSIT_CONFIRMED'), true);
  assert.equal(canOpenCustomerHandoff('PRODUCT_ADMIN', 'DEPOSIT_CONFIRMED'), false);
});

test('draft records stay hidden from submitted workbenches', () => {
  assert.equal(isSubmittedCustomerStatus('DRAFT'), false);
  assert.equal(isSubmittedCustomerStatus('PENDING_VERIFICATION'), true);
  assert.equal(isSubmittedContractStatus('DRAFT'), false);
  assert.equal(isSubmittedContractStatus('PENDING_REVIEW'), true);
});

test('lock payment confirmations follow the Sales then Sales Admin sequence', () => {
  assert.equal(canSalesConfirmPayment('SALES', 'sales-1', 'sales-1'), true);
  assert.equal(canSalesConfirmPayment('SALES', 'sales-2', 'sales-1'), false);
  assert.equal(canConfirmLockTransfer('SALES_ADMIN', 'PAYMENT_PENDING'), true);
  assert.equal(canConfirmLockTransfer('SALES_ADMIN', 'ACTIVE'), false);
  assert.equal(canConfirmLockTransfer('MANAGER', 'PAYMENT_PENDING'), true);
});

test('only reviewers can request contract changes', () => {
  assert.equal(canRequestContractChanges('SALES_ADMIN'), true);
  assert.equal(canRequestContractChanges('MANAGER'), true);
  assert.equal(canRequestContractChanges('SALES'), false);
  assert.equal(canRequestContractChanges('PRODUCT_ADMIN'), false);
});

test('only Sales Admin or Manager can approve a booking payment', () => {
  assert.equal(canApproveBooking('SALES_ADMIN'), true);
  assert.equal(canApproveBooking('MANAGER'), true);
  assert.equal(canApproveBooking('SALES'), false);
  assert.equal(canApproveBooking('PRODUCT_ADMIN'), false);
});

test('booking information updates enforce the assigned Sales owner', () => {
  const source = fs.readFileSync(new URL('../../src/app/api/v1/bookings/[id]/route.ts', import.meta.url), 'utf8');
  assert.match(source, /canSalesActOnBooking/);
  assert.match(source, /status: 403/);
});

test('PDF export is not exposed by contract workbenches', () => {
  const sources = [
    fs.readFileSync(new URL('../../src/components/ContractWorkflow.tsx', import.meta.url), 'utf8'),
    fs.readFileSync(new URL('../../src/components/ComprehensiveContractModal.tsx', import.meta.url), 'utf8')
  ].join('\n');
  assert.doesNotMatch(sources, /jspdf|Xuất PDF|handleExportPDF|handleExportContractPDF/i);
});

test('bank webhook waits for Sales Admin before finalizing the product', () => {
  const source = fs.readFileSync(new URL('../../src/app/api/v1/payments/webhooks/vietqr/route.ts', import.meta.url), 'utf8');
  assert.match(source, /status: 'REVIEW_REQUIRED'/);
  assert.doesNotMatch(source, /status: 'DEPOSITED'/);
  assert.doesNotMatch(source, /toStatus: 'DEPOSITED'/);
});
