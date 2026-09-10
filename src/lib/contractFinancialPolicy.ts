import { canEditCompanyFinancials, canViewCommission, canViewCompanyRevenue } from './rolePolicy.ts';

const FINANCIAL_INPUT_KEYS = [
  'doanhthu',
  'doanhthuThucte',
  'hoahong',
  'commissionAmount',
  'commissionStatus',
  'trangthaiHoaHong',
  'trangThaiHoaHong',
  'commissionDueDate'
];

function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('FINANCIAL_VALUE_INVALID: financial amounts must be non-negative numbers');
  }
  return amount;
}

export function getAuthorizedFinancialFields(
  role: string,
  body: Record<string, unknown>
): Record<string, unknown> {
  const suppliedKeys = FINANCIAL_INPUT_KEYS.filter((key) => body[key] !== undefined);
  if (suppliedKeys.length > 0 && !canEditCompanyFinancials(role)) {
    throw new Error('FINANCIAL_FIELDS_FORBIDDEN: only SALES_ADMIN can update financial fields');
  }

  if (!canEditCompanyFinancials(role)) return {};

  const fields: Record<string, unknown> = {};
  if (body.doanhthu !== undefined || body.doanhthuThucte !== undefined) {
    fields.doanhthu = parseAmount(body.doanhthu ?? body.doanhthuThucte);
  }
  if (body.hoahong !== undefined || body.commissionAmount !== undefined) {
    const amount = parseAmount(body.hoahong ?? body.commissionAmount);
    fields.hoahong = amount;
    fields.commissionAmount = amount;
  }
  const commissionStatus = body.commissionStatus
    ?? body.trangthaiHoaHong
    ?? body.trangThaiHoaHong;
  if (commissionStatus !== undefined) {
    fields.commissionStatus = commissionStatus;
  }
  if (body.commissionDueDate !== undefined) {
    fields.commissionDueDate = body.commissionDueDate;
  }
  return fields;
}

export function sanitizeContractForRole(
  contract: Record<string, any>,
  role: string,
  viewerEmployeeCode?: string
): Record<string, any> {
  const sanitized = { ...contract };
  const ownerEmployeeCode = contract.salesEmployee?.employeeCode;
  const canViewRevenue = canViewCompanyRevenue(role);
  const canViewOwnCommission = canViewCommission(role, ownerEmployeeCode, viewerEmployeeCode);

  if (!canViewRevenue && !canEditCompanyFinancials(role)) {
    delete sanitized.doanhthu;
  }

  if (!canViewRevenue && !canEditCompanyFinancials(role) && !canViewOwnCommission) {
    delete sanitized.hoahong;
    delete sanitized.commissionAmount;
    delete sanitized.commissionStatus;
    delete sanitized.trangthaiThanhtoan;
    delete sanitized.commissionDueDate;
  }
  return sanitized;
}

export function sumExplicitAmounts(
  records: Array<Record<string, unknown>>,
  field: string
): number {
  return records.reduce((total, record) => {
    const value = record[field];
    if (value === null || value === undefined || value === '') return total;
    const amount = Number(value);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}
