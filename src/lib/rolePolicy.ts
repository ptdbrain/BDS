const normalizeRole = (role: string | null | undefined) => String(role || '').trim().toUpperCase();

export function canViewCompanyRevenue(role: string): boolean {
  return normalizeRole(role) === 'MANAGER';
}

export function canEditCompanyFinancials(role: string): boolean {
  return normalizeRole(role) === 'SALES_ADMIN';
}

export function canViewCommission(
  role: string,
  ownerEmployeeCode?: string,
  viewerEmployeeCode?: string
): boolean {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'MANAGER' || normalizedRole === 'SALES_ADMIN') return true;
  return normalizedRole === 'SALES'
    && Boolean(ownerEmployeeCode)
    && ownerEmployeeCode === viewerEmployeeCode;
}

export function getReportTabsForRole(role: string): string[] {
  switch (normalizeRole(role)) {
    case 'MANAGER':
      return ['bc_doanhthu', 'bc_sanpham_duan', 'bc_doanhso_nv', 'kpi_dashboard'];
    case 'PRODUCT_ADMIN':
      return ['bc_sanpham_duan'];
    default:
      return [];
  }
}

export function getNavigationTabsForRole(role: string): string[] {
  switch (normalizeRole(role)) {
    case 'SALES':
      return ['inventory', 'locks', 'my_contracts', 'transactions_revenue'];
    case 'PRODUCT_ADMIN':
      return ['inventory', 'reports'];
    case 'SALES_ADMIN':
      return ['locks', 'contracts', 'customers'];
    case 'MANAGER':
      return ['inventory', 'locks', 'customers', 'contracts', 'reports'];
    default:
      return [];
  }
}
