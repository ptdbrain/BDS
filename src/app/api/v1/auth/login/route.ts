import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SSO_ACCOUNTS } from '@/lib/authConfig';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { employeeCode, ssoCode, password } = body;

    const targetCode = (ssoCode || employeeCode || '').trim().toUpperCase();

    if (!targetCode) {
      return NextResponse.json({
        error: 'Vui lòng cung cấp Mã nhân viên hoặc chọn tài khoản SSO!'
      }, { status: 400 });
    }

    // 1. Check if matching our 5 configured SSO accounts
    const ssoPreset = SSO_ACCOUNTS.find(
      (acc) => acc.code.toUpperCase() === targetCode || acc.email.toLowerCase() === targetCode.toLowerCase()
    );

    // 2. Query database for accurate employee record
    const dbEmp = await db.employee.findFirst({
      where: {
        OR: [
          { employeeCode: targetCode },
          { maNV: targetCode },
          { email: targetCode.toLowerCase() }
        ]
      },
      include: { department: true }
    });

    let role = ssoPreset?.role || 'SALES';
    if (!ssoPreset && dbEmp) {
      if (dbEmp.jobTitle.toLowerCase().includes('admin') && !dbEmp.jobTitle.toLowerCase().includes('product')) {
        role = 'SALES_ADMIN';
      } else if (dbEmp.jobTitle.toLowerCase().includes('sản phẩm')) {
        role = 'PRODUCT_ADMIN';
      } else if (dbEmp.jobTitle.toLowerCase().includes('giám đốc') || dbEmp.jobTitle.toLowerCase().includes('quản lý')) {
        role = 'MANAGER';
      }
    }

    const userData = {
      id: dbEmp?.id || `emp_${targetCode.toLowerCase()}`,
      employeeCode: dbEmp?.employeeCode || ssoPreset?.code || targetCode,
      fullName: dbEmp?.fullName || ssoPreset?.fullName || 'Nhân viên AHS',
      email: dbEmp?.email || ssoPreset?.email || `${targetCode.toLowerCase()}@ahs.com.vn`,
      jobTitle: dbEmp?.jobTitle || ssoPreset?.jobTitle || 'Chuyên viên',
      role,
      departmentName: dbEmp?.department?.name || ssoPreset?.departmentName || 'Công ty AHS',
      phone: dbEmp?.phone || ssoPreset?.phone || '0900.000.000',
      avatarText: ssoPreset?.avatarText || (dbEmp?.fullName ? dbEmp.fullName.slice(-2).toUpperCase() : 'NV'),
      badgeLabel: ssoPreset?.badgeLabel || role,
      badgeColor: ssoPreset?.badgeColor || 'bg-brand-500/20 text-brand-300 border-brand-500/30'
    };

    // Record audit log
    await createAuditLog({
      actorId: userData.id,
      actorName: userData.fullName,
      action: 'USER_LOGIN',
      entityType: 'AUTH_SESSION',
      entityId: userData.id,
      afterJson: {
        employeeCode: userData.employeeCode,
        role: userData.role,
        loginType: ssoCode ? 'SSO_ONE_CLICK' : 'CREDENTIALS'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Đăng nhập thành công! Chào mừng ${userData.fullName} (${userData.role})`,
      data: {
        user: userData,
        token: `ahs_token_${userData.employeeCode}_${Date.now()}`
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
