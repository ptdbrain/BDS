import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewCompanyRevenue, canEditCompanyFinancials, getReportTabsForRole, getNavigationTabsForRole } from '../../src/lib/rolePolicy.ts';
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
