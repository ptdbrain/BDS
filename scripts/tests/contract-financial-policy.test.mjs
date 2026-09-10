import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAuthorizedFinancialFields,
  sanitizeContractForRole,
  sumExplicitAmounts
} from '../../src/lib/contractFinancialPolicy.ts';

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
