export interface FinancialContract {
  giahopdong?: number | null;
  agreedPrice?: number | null;
  doanhso?: number | null;
  dealRevenue?: number | null;
  doanhthu?: number | null;
  hoahong?: number | null;
  commissionAmount?: number | null;
}

export interface FinancialTotals {
  transactionCount: number;
  totalSales: number;
  totalRevenue: number;
  totalCommission: number;
  revenueAfterCommission: number;
  avgSalesPerTransaction: number;
  avgRevenuePerTransaction: number;
}

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/** DoanhSo is the contract sale value; prefer the authoritative GiaHopDong field. */
export function getContractSales(contract: FinancialContract): number {
  return numericValue(contract.giahopdong)
    ?? numericValue(contract.agreedPrice)
    ?? numericValue(contract.doanhso)
    ?? numericValue(contract.dealRevenue)
    ?? 0;
}

/** DoanhThu is an explicit amount entered for money actually received. */
export function getContractRevenue(contract: FinancialContract): number {
  return numericValue(contract.doanhthu) ?? 0;
}

/** HoaHong is an explicit amount entered by Sales Admin, with the legacy alias as fallback. */
export function getContractCommission(contract: FinancialContract): number {
  return numericValue(contract.hoahong) ?? numericValue(contract.commissionAmount) ?? 0;
}

export function calculateFinancialTotals(contracts: FinancialContract[]): FinancialTotals {
  const transactionCount = contracts.length;
  const totalSales = contracts.reduce((sum, contract) => sum + getContractSales(contract), 0);
  const totalRevenue = contracts.reduce((sum, contract) => sum + getContractRevenue(contract), 0);
  const totalCommission = contracts.reduce((sum, contract) => sum + getContractCommission(contract), 0);

  return {
    transactionCount,
    totalSales,
    totalRevenue,
    totalCommission,
    revenueAfterCommission: totalRevenue - totalCommission,
    avgSalesPerTransaction: transactionCount > 0 ? Math.round(totalSales / transactionCount) : 0,
    avgRevenuePerTransaction: transactionCount > 0 ? Math.round(totalRevenue / transactionCount) : 0
  };
}
