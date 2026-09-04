import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get('role') || 'SALES';

  const roleCodeMap: Record<string, { code: string; defaultName: string; defaultJob: string; defaultDept: string }> = {
    SALES: {
      code: 'NV001',
      defaultName: 'Nguyễn Minh Khôi',
      defaultJob: 'Chuyên viên kinh doanh',
      defaultDept: 'Phòng Kinh doanh'
    },
    PRODUCT_ADMIN: {
      code: 'NV009',
      defaultName: 'Nguyễn Thùy Dương',
      defaultJob: 'Chuyên viên quản lý sản phẩm',
      defaultDept: 'Phòng Quản lý sản phẩm'
    },
    SALES_ADMIN: {
      code: 'NV007',
      defaultName: 'Vũ Mai Phương',
      defaultJob: 'Sales Admin',
      defaultDept: 'Sales Admin'
    },
    MANAGER: {
      code: 'NV010',
      defaultName: 'Trần Gia Bảo',
      defaultJob: 'Quản lý dự án',
      defaultDept: 'Ban Lãnh đạo'
    }
  };

  const target = roleCodeMap[roleParam] || roleCodeMap.SALES;

  try {
    const dbEmp = await db.employee.findFirst({
      where: {
        OR: [
          { employeeCode: target.code },
          { maNV: target.code }
        ]
      },
      include: { department: true }
    });

    if (dbEmp) {
      return NextResponse.json({
        data: {
          id: dbEmp.id,
          employeeCode: dbEmp.employeeCode,
          fullName: dbEmp.fullName,
          email: dbEmp.email,
          jobTitle: dbEmp.jobTitle,
          role: roleParam,
          departmentName: dbEmp.department?.name || target.defaultDept
        },
        meta: { timestamp: new Date().toISOString() }
      });
    }
  } catch (err) {
    console.error('Error finding employee in db:', err);
  }

  // Fallback
  return NextResponse.json({
    data: {
      id: `emp_${roleParam.toLowerCase()}`,
      employeeCode: target.code,
      fullName: target.defaultName,
      email: `${target.code.toLowerCase()}@ahs.com.vn`,
      jobTitle: target.defaultJob,
      role: roleParam,
      departmentName: target.defaultDept
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}
