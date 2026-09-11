const normalizeRole = (role: string | null | undefined) => String(role || '').trim().toUpperCase();
const normalizeStatus = (status: string | null | undefined) => String(status || '').trim().toUpperCase();

export function isManagerReadOnly(role: string): boolean {
  return normalizeRole(role) === 'MANAGER';
}

export function canViewCompanyRevenue(role: string): boolean {
  return normalizeRole(role) === 'MANAGER';
}

export function canEditCompanyFinancials(role: string): boolean {
  return normalizeRole(role) === 'SALES_ADMIN';
}

export function canSalesActOnBooking(
  role: string,
  actorId: string | null | undefined,
  bookingSalesEmployeeId: string | null | undefined
): boolean {
  return normalizeRole(role) === 'SALES'
    && Boolean(actorId)
    && Boolean(bookingSalesEmployeeId)
    && actorId === bookingSalesEmployeeId;
}

export function canSalesConfirmPayment(
  role: string,
  actorId: string | null | undefined,
  lockSalesEmployeeId: string | null | undefined
): boolean {
  return canSalesActOnBooking(role, actorId, lockSalesEmployeeId);
}

export function canConfirmLockTransfer(role: string, lockStatus: string | null | undefined): boolean {
  return normalizeRole(role) === 'SALES_ADMIN'
    && normalizeStatus(lockStatus) === 'PAYMENT_PENDING';
}

export function canRequestContractChanges(role: string): boolean {
  return normalizeRole(role) === 'SALES_ADMIN';
}

export function canApproveBooking(role: string): boolean {
  return normalizeRole(role) === 'SALES_ADMIN';
}

export function canReviewContract(role: string): boolean {
  return normalizeRole(role) === 'SALES_ADMIN';
}

export function canOpenCustomerHandoff(role: string, paymentStatus: string | null | undefined): boolean {
  return normalizeRole(role) === 'SALES' && normalizeStatus(paymentStatus) === 'DEPOSIT_CONFIRMED';
}

export function isSubmittedCustomerStatus(status: string | null | undefined): boolean {
  return normalizeStatus(status) !== '' && normalizeStatus(status) !== 'DRAFT';
}

export function isSubmittedContractStatus(status: string | null | undefined): boolean {
  return normalizeStatus(status) !== '' && normalizeStatus(status) !== 'DRAFT';
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
