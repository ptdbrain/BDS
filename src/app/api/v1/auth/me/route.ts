import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get('role') || 'SALES';

  const rolesMap: Record<string, any> = {
    SALES: {
      id: 'emp_sales_01',
      employeeCode: 'NV-SALE-01',
      fullName: 'Trần Văn Nam',
      email: 'nam.tran@ahs.com.vn',
      jobTitle: 'Nhân Viên Kinh Doanh (Sales)',
      role: 'SALES',
      departmentName: 'Phòng Kinh Doanh Bất Động Sản'
    },
    PRODUCT_ADMIN: {
      id: 'emp_prod_01',
      employeeCode: 'NV-PROD-01',
      fullName: 'Nguyễn Tiến Dũng',
      email: 'dung.nguyen@ahs.com.vn',
      jobTitle: 'Nhân Viên Quản Lý Sản Phẩm',
      role: 'PRODUCT_ADMIN',
      departmentName: 'Phòng Quản Lý Quỹ Hàng & Sản Phẩm'
    },
    SALES_ADMIN: {
      id: 'emp_admin_01',
      employeeCode: 'NV-ADMIN-01',
      fullName: 'Phạm Thị Mai',
      email: 'mai.pham@ahs.com.vn',
      jobTitle: 'Sales Admin (Kế toán & Pháp lý)',
      role: 'SALES_ADMIN',
      departmentName: 'Phòng Sales Admin & Duyệt Hợp Đồng'
    },
    MANAGER: {
      id: 'emp_mgmt_01',
      employeeCode: 'NV-MGMT-01',
      fullName: 'Hoàng Quốc Việt',
      email: 'viet.hoang@ahs.com.vn',
      jobTitle: 'Giám Đốc Kinh Doanh (Manager)',
      role: 'MANAGER',
      departmentName: 'Ban Giám Đốc & Báo Cáo'
    }
  };

  const user = rolesMap[roleParam] || rolesMap.SALES;

  return NextResponse.json({
    data: user,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}
