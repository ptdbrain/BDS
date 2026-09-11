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
import { readJsonResponse } from '../../src/lib/readJsonResponse.ts';

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
  assert.equal(canConfirmLockTransfer('MANAGER', 'PAYMENT_PENDING'), false);
});

test('only Sales Admin can review customer and contract changes', () => {
  assert.equal(canRequestContractChanges('SALES_ADMIN'), true);
  assert.equal(canRequestContractChanges('MANAGER'), false);
  assert.equal(canRequestContractChanges('SALES'), false);
  assert.equal(canRequestContractChanges('PRODUCT_ADMIN'), false);
});

test('only Sales Admin can approve a booking payment', () => {
  assert.equal(canApproveBooking('SALES_ADMIN'), true);
  assert.equal(canApproveBooking('MANAGER'), false);
  assert.equal(canApproveBooking('SALES'), false);
  assert.equal(canApproveBooking('PRODUCT_ADMIN'), false);
});

test('Manager stays visible in operational modules but all write controls are read-only', () => {
  assert.deepEqual(getNavigationTabsForRole('MANAGER'), ['inventory', 'locks', 'customers', 'contracts', 'reports']);
  assert.equal(canConfirmLockTransfer('MANAGER', 'PAYMENT_PENDING'), false);
  assert.equal(canRequestContractChanges('MANAGER'), false);
  assert.equal(canApproveBooking('MANAGER'), false);

  const inventorySource = fs.readFileSync(new URL('../../src/components/InventoryMatrix.tsx', import.meta.url), 'utf8');
  const lockSource = fs.readFileSync(new URL('../../src/components/LockManager.tsx', import.meta.url), 'utf8');
  const customerSource = fs.readFileSync(new URL('../../src/components/CustomerManager.tsx', import.meta.url), 'utf8');
  const contractSource = fs.readFileSync(new URL('../../src/components/ComprehensiveContractModal.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(inventorySource, /currentRole === 'MANAGER'/, 'inventory must not expose Manager write paths');
  assert.match(lockSource, /currentRole === 'PRODUCT_ADMIN' \|\| currentRole === 'MANAGER'/, 'transactions must render a Manager read-only state');
  assert.doesNotMatch(lockSource, /currentRole === 'SALES_ADMIN' \|\| currentRole === 'MANAGER'/, 'transactions must not expose Manager approval paths');
  assert.match(customerSource, /const canReviewCustomers = currentRole === 'SALES_ADMIN'/);
  assert.match(contractSource, /const canReviewContract = isSalesAdmin;/);
  assert.match(contractSource, /isSales && !isApproved/);
  assert.doesNotMatch(contractSource, /!isSalesAdmin && !isApproved/);
});

test('selling projects are not blocked by the future launch schedule', () => {
  const seedSource = fs.readFileSync(new URL('../../scripts/import_excel_practice_data.mjs', import.meta.url), 'utf8');
  assert.match(
    seedSource,
    /saleOpenAt:\s*isSelling\s*\?\s*null\s*:\s*new Date\(2026,\s*8,\s*11,\s*14,\s*0,\s*0\)/,
    'open-for-sale projects must not inherit the future launch time'
  );
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

test('contract workbenches parse non-JSON responses without throwing', () => {
  const workflowSource = fs.readFileSync(new URL('../../src/components/ContractWorkflow.tsx', import.meta.url), 'utf8');
  const modalSource = fs.readFileSync(new URL('../../src/components/ComprehensiveContractModal.tsx', import.meta.url), 'utf8');

  assert.match(workflowSource, /readJsonResponse/);
  assert.doesNotMatch(workflowSource, /const data = await res\.json\(\);/);
  assert.match(modalSource, /readJsonResponse/);
});

test('response parser returns useful errors for HTML and empty API responses', async () => {
  const html = await readJsonResponse(new Response('<!doctype html>', { status: 502 }));
  const empty = await readJsonResponse(new Response('', { status: 502 }));
  const json = await readJsonResponse(new Response(JSON.stringify({ success: true }), { status: 200 }));

  assert.equal(html.error, 'Máy chủ trả về phản hồi không hợp lệ (HTTP 502).');
  assert.equal(empty.error, 'Máy chủ trả về phản hồi rỗng (HTTP 502).');
  assert.deepEqual(json, { success: true });
});

test('Excel export refreshes the report snapshot before writing rows', () => {
  const source = fs.readFileSync(new URL('../../src/components/ReportsDashboard.tsx', import.meta.url), 'utf8');

  assert.match(source, /const exportData = await fetchReportSnapshot\(\);/);
  assert.match(source, /exportData\.report1_DoanhThu/);
  assert.match(source, /exportData\.report2_SanPhamDuAn/);
  assert.match(source, /exportData\.report3_DoanhSoNV/);
  assert.match(source, /readJsonResponse/);
  assert.doesNotMatch(source, /const json = await res\.json\(\);/);
});

test('reports keep DoanhSo, DoanhThu, and HoaHong in separate columns', () => {
  const routeSource = fs.readFileSync(new URL('../../src/app/api/v1/reports/dashboard/route.ts', import.meta.url), 'utf8');
  const dashboardSource = fs.readFileSync(new URL('../../src/components/ReportsDashboard.tsx', import.meta.url), 'utf8');

  assert.match(routeSource, /totalRevenue: displayEmployeePerformance\.reduce\(\(sum, e\) => sum \+ e\.totalRevenue, 0\)/);
  assert.doesNotMatch(routeSource, /totalRevenue: eSales/);
  assert.match(routeSource, /revenueAfterCommission/);
  assert.match(dashboardSource, /Tổng doanh số \(Giá HĐ\)/i);
  assert.match(dashboardSource, /Doanh thu AHS/i);
  assert.match(dashboardSource, /Doanh thu sau hoa hồng/i);
  assert.match(dashboardSource, /Doanh thu bình quân\/GD/i);

  const contractWorkflowSource = fs.readFileSync(new URL('../../src/components/ContractWorkflow.tsx', import.meta.url), 'utf8');
  assert.match(contractWorkflowSource, /doanhthu: investorFormData\.doanhthu/);
  assert.match(contractWorkflowSource, /Doanh Thu Thực Nhận Từ Giao Dịch/i);

  const modalSource = fs.readFileSync(new URL('../../src/components/ComprehensiveContractModal.tsx', import.meta.url), 'utf8');
  assert.match(modalSource, /doanhthu: e\.target\.value === '' \? null : Number\(e\.target\.value\)/);
  assert.match(modalSource, /doanhso: Number\(contract\.giahopdong \?\? contract\.agreedPrice/);

  const approveSource = fs.readFileSync(new URL('../../src/app/api/v1/contracts/[id]/approve/route.ts', import.meta.url), 'utf8');
  assert.match(approveSource, /const calculatedSales = getContractSales\(\{ \.\.\.contract, \.\.\.contractData \}\)/);
  assert.match(approveSource, /giahopdong: calculatedSales/);
  assert.match(approveSource, /doanhso: calculatedSales/);
});

test('bank webhook waits for Sales Admin before finalizing the product', () => {
  const source = fs.readFileSync(new URL('../../src/app/api/v1/payments/webhooks/vietqr/route.ts', import.meta.url), 'utf8');
  assert.match(source, /status: 'REVIEW_REQUIRED'/);
  assert.doesNotMatch(source, /status: 'DEPOSITED'/);
  assert.doesNotMatch(source, /toStatus: 'DEPOSITED'/);
});
