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

// -------------------------------------------------------------
// CLASS DIAGRAM DATA STRUCTURES
// -------------------------------------------------------------

// 1. Chudautu
export interface Chudautu {
  maCDT: string | number;
  tenCDT: string;
}

// 2. Duan
export interface Duan {
  maDA: string | number;
  tenDA: string;
  trangthaiDA: string;
  diadiem: string;
}

// 3. Loaisanpham
export interface Loaisanpham {
  maLoaisanpham: string | number;
  loaiSanpham: string;
}

// 4. Sanpham
export interface Sanpham {
  maCan: string;
  dientich: number;
  huong: string;
  gianiemyet: number;
  giaTTS: number;
  giaTTC: number;
  giaVay: number;
  trangthai: string;
}

// 5. Booking
export interface BookingItem {
  id: string;
  maLuotBooking: string;
  tgBooking: string | Date;
  sttBooking: number;
  tgBatdaukhop?: string | Date | null;
  tgKetthuckhopcan?: string | Date | null;
  trangthaikhopcan: string;
  customerName?: string | null;
  customerPhone?: string | null;
  depositAmount?: number | null;
  notes?: string | null;
  project?: {
    id: string;
    name: string;
    code: string;
  };
  salesEmployee?: {
    id: string;
    fullName: string;
    phone: string;
  };
}

// 6. Luotlock
export interface Luotlock {
  malock: string | number;
  thoigianbatdau: string | Date;
  thoigianketthuc: string | Date;
  sotiencoc: number;
  trangthaigiaodich: string;
  thoigiancoc: string | Date;
  ghichu?: string;
}

// 7. Hopdong
export interface Hopdong {
  mahopdong: string | number;
  maKH: string | number;
  sodienthoaiKH: string;
  cccdKH: string;
  emailKH: string;
  diachiKH: string;
  hotenKH: string;
  phuonganthanhtoan: string;
  giahopdong: number;
  thoigiankiHDMB: string | Date;
  trangthaiHDMB: string;
  doanhso: number;
  hoahong: number;
  trangthaiThanhtoan: string;
  ghichu?: string;
}

// 8. Nhanvien
export interface Nhanvien {
  maNV: string | number;
  chucvu: string;
  sodienthoaiNV: string;
  hotenNV: string;
}

// 9. Phongban
export interface Phongban {
  maPhongban: string | number;
  tenphongban: string;
}

