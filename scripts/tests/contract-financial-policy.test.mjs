import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAuthorizedFinancialFields,
  sanitizeContractForRole,
  sumExplicitAmounts
} from '../../src/lib/contractFinancialPolicy.ts';
import {
  calculateFinancialTotals,
  getContractSales
} from '../../src/lib/reportFinancials.ts';

test('Sales Admin can write the three financial fields', () => {
  assert.deepEqual(
    getAuthorizedFinancialFields('SALES_ADMIN', {
      doanhthu: 240000000,
      hoahong: 144000000,
      commissionStatus: 'DA_TRA'
    }),
    {
      doanhthu: 240000000,
      hoahong: 144000000,
      commissionAmount: 144000000,
      commissionStatus: 'DA_TRA'
    }
  );
});

test('Sales and Manager cannot write financial fields', () => {
  assert.throws(
    () => getAuthorizedFinancialFields('SALES', { doanhthu: 1 }),
    /FINANCIAL_FIELDS_FORBIDDEN/
  );
  assert.throws(
    () => getAuthorizedFinancialFields('MANAGER', { hoahong: 1 }),
    /FINANCIAL_FIELDS_FORBIDDEN/
  );
});

test('sanitization keeps only permitted commission data', () => {
  const contract = {
    id: 'contract-1',
    doanhthu: 240000000,
    hoahong: 144000000,
    commissionStatus: 'DA_TRA',
    commissionDueDate: '30/11/2026',
    salesEmployee: { employeeCode: 'NV001' }
  };

  assert.equal(sanitizeContractForRole(contract, 'PRODUCT_ADMIN', 'NV009').doanhthu, undefined);
  assert.equal(sanitizeContractForRole(contract, 'PRODUCT_ADMIN', 'NV009').hoahong, undefined);
  assert.equal(sanitizeContractForRole(contract, 'MANAGER', 'NV010').doanhthu, 240000000);
  assert.equal(sanitizeContractForRole(contract, 'SALES', 'NV001').hoahong, 144000000);
  assert.equal(sanitizeContractForRole(contract, 'SALES', 'NV002').hoahong, undefined);
});

test('report sums explicit amounts without percentage fallbacks', () => {
  assert.equal(sumExplicitAmounts([{ doanhthu: 100 }, { doanhthu: null }, { doanhthu: undefined }], 'doanhthu'), 100);
  assert.equal(sumExplicitAmounts([{ hoahong: 100 }, { hoahong: 0 }], 'hoahong'), 100);
});

test('DoanhSo follows GiaHopDong while DoanhThu and HoaHong remain explicit inputs', () => {
  const contracts = [
    { giahopdong: 1000, doanhso: 900, doanhthu: 300, hoahong: 50 },
    { giahopdong: 2000, doanhthu: null, hoahong: null },
    { giahopdong: 0, doanhso: 500, doanhthu: 100, hoahong: 20 }
  ];

  assert.equal(getContractSales(contracts[0]), 1000);
  assert.deepEqual(calculateFinancialTotals(contracts), {
    transactionCount: 3,
    totalSales: 3000,
    totalRevenue: 400,
    totalCommission: 70,
    revenueAfterCommission: 330,
    avgSalesPerTransaction: 1000,
    avgRevenuePerTransaction: 133
  });
});
