export type UserRole = 'SALES' | 'PRODUCT_ADMIN' | 'SALES_ADMIN' | 'MANAGER';

export interface CurrentUser {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  role: UserRole;
  departmentName: string;
}

export type ProductStatus = 'AVAILABLE' | 'LOCKED' | 'DEPOSITED' | 'SOLD' | 'UNAVAILABLE';

export type LockStatus = 'ACTIVE' | 'PAYMENT_PENDING' | 'DEPOSIT_CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export type CustomerVerificationStatus = 'DRAFT' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'CHANGE_REQUESTED' | 'REJECTED';

export type ContractStatus = 'DRAFT' | 'PENDING_REVIEW' | 'CHANGE_REQUESTED' | 'APPROVED' | 'REJECTED' | 'SIGNED' | 'CANCELLED';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance?: string;
  requestId?: string;
  errors?: Array<{ pointer: string; code: string; message?: string }>;
}
