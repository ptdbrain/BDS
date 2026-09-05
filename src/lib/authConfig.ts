// src/lib/authConfig.ts
// Metadata and permissions for the 5 official AHS SSO accounts

import { UserRole } from './types';

export interface SSOAccountConfig {
  code: string;
  fullName: string;
  jobTitle: string;
  departmentName: string;
  role: UserRole;
  email: string;
  phone: string;
  avatarText: string;
  color: string;
  badgeLabel: string;
  badgeColor: string;
  description: string;
  permissions: string[];
}

export const SSO_ACCOUNTS: SSOAccountConfig[] = [
  {
    code: 'NV001',
    fullName: 'Nguyễn Minh Khôi',
    jobTitle: 'Chuyên viên kinh doanh 1',
    departmentName: 'Phòng Kinh doanh',
    role: 'SALES',
    email: 'nv001@ahs.com.vn',
    phone: '0912.001.001',
    avatarText: 'MK',
    color: 'from-amber-500 to-orange-500',
    badgeLabel: 'SALES - KINH DOANH 1',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Chuyên viên kinh doanh chính. Khóa giữ căn 30 phút, quản lý khách hàng cá nhân và theo dõi doanh số cá nhân.',
    permissions: [
      'Xem thông tin dự án & quỹ căn',
      'Thực hiện khóa giữ căn 30 phút',
      'Đăng ký thông tin khách hàng cá nhân',
      'Theo dõi doanh số & hoa hồng cá nhân'
    ]
  },
  {
    code: 'NV002',
    fullName: 'Trần Thu Hà',
    jobTitle: 'Chuyên viên kinh doanh 2',
    departmentName: 'Phòng Kinh doanh',
    role: 'SALES',
    email: 'nv002@ahs.com.vn',
    phone: '0912.002.002',
    avatarText: 'TH',
    color: 'from-orange-500 to-rose-500',
    badgeLabel: 'SALES - KINH DOANH 2',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: 'Chuyên viên kinh doanh phụ trách phân khúc cao cấp. Tài khoản thứ 2 thử nghiệm cạnh tranh bảng hàng realtime.',
    permissions: [
      'Xem thông tin dự án & quỹ căn',
      'Thực hiện khóa giữ căn 30 phút',
      'Đăng ký thông tin khách hàng cá nhân',
      'Theo dõi doanh số & hoa hồng cá nhân'
    ]
  },
  {
    code: 'NV009',
    fullName: 'Nguyễn Thùy Dương',
    jobTitle: 'Chuyên viên quản lý sản phẩm',
    departmentName: 'Phòng Quản lý sản phẩm',
    role: 'PRODUCT_ADMIN',
    email: 'nv009@ahs.com.vn',
    phone: '0912.009.009',
    avatarText: 'TD',
    color: 'from-blue-500 to-cyan-500',
    badgeLabel: 'QL SẢN PHẨM & QUỸ HÀNG',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Quản lý toàn bộ thông tin dự án, slide trình chiếu, thêm căn và quỹ hàng, import Excel bảng hàng và xem tiến độ bán.',
    permissions: [
      'Thêm & chỉnh sửa slide hình ảnh dự án',
      'Thêm từng căn hộ vào quỹ hàng (Class diagram)',
      'Import quỹ căn hàng loạt từ Excel',
      'Xem danh mục giao dịch (chỉ xem, không xác nhận cọc)',
      'Xem báo cáo quỹ hàng & tỷ lệ hấp thụ'
    ]
  },
  {
    code: 'NV007',
    fullName: 'Vũ Mai Phương',
    jobTitle: 'Sales Admin (Kiểm duyệt)',
    departmentName: 'Phòng Sales Admin',
    role: 'SALES_ADMIN',
    email: 'nv007@ahs.com.vn',
    phone: '0912.007.007',
    avatarText: 'MP',
    color: 'from-purple-500 to-indigo-500',
    badgeLabel: 'SALES ADMIN (DUYỆT CỌC/KYC)',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Xác nhận chuyển khoản cọc (chuyển căn từ Lock sang Đã Bán), kiểm duyệt hồ sơ KYC khách hàng và nhập HĐMB từ CĐT.',
    permissions: [
      'Kiểm tra & Xác nhận tiền chuyển khoản cọc',
      'Chuyển trạng thái căn từ Lock sang Đã Bán',
      'Kiểm duyệt KYC thông tin khách hàng',
      'Nhập hợp đồng mua bán từ CĐT kèm doanh số & hoa hồng',
      'Xuất danh sách khách hàng gửi Chủ đầu tư'
    ]
  },
  {
    code: 'NV010',
    fullName: 'Trần Gia Bảo',
    jobTitle: 'Giám đốc / Ban Báo Cáo',
    departmentName: 'Ban Giám Đốc',
    role: 'MANAGER',
    email: 'nv010@ahs.com.vn',
    phone: '0912.010.010',
    avatarText: 'GB',
    color: 'from-emerald-500 to-teal-500',
    badgeLabel: 'BAN GIÁM ĐỐC / QUẢN TRỊ',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Toàn quyền điều hành cao cấp. Xem toàn bộ 3 Mẫu Báo Cáo Chuẩn AHS, bảng xếp hạng nhân viên và tiến độ bán hàng dự án.',
    permissions: [
      'Toàn quyền truy cập tất cả phân hệ',
      'Xem 3 Mẫu Báo Cáo AHS (Doanh thu, Dự án, Doanh số NV)',
      'Phê duyệt hợp đồng mua bán & chính sách bán hàng',
      'Giám sát realtime toàn bộ quỹ căn và giao dịch'
    ]
  }
];
