import { db } from '@/lib/db';

/**
 * Resolves any employee identifier (UUID, employeeCode like NV001, or legacy string like emp_sales_01)
 * into a guaranteed valid Employee UUID existing in the database.
 */
export async function resolveEmployeeId(
  input?: string | null,
  roleHint?: 'SALES' | 'SALES_ADMIN' | 'PRODUCT_ADMIN' | 'MANAGER'
): Promise<string> {
  // 1. If input is provided, check if it's already a valid employee ID
  if (input) {
    try {
      const directEmp = await db.employee.findUnique({
        where: { id: input }
      });
      if (directEmp) return directEmp.id;
    } catch {
      // Input wasn't a valid UUID format
    }

    // Check by employeeCode or maNV (e.g. 'NV001', 'NV007')
    const codeEmp = await db.employee.findFirst({
      where: {
        OR: [
          { employeeCode: input },
          { maNV: input }
        ]
      }
    });
    if (codeEmp) return codeEmp.id;

    // Check if input contains role hints (e.g. emp_admin_01, emp_sales_admin)
    const lower = input.toLowerCase();
    if (lower.includes('admin') || lower.includes('nv007')) {
      const adminEmp = await db.employee.findFirst({
        where: {
          OR: [{ employeeCode: 'NV007' }, { maNV: 'NV007' }]
        }
      });
      if (adminEmp) return adminEmp.id;
    }
  }

  // 2. Resolve based on roleHint
  if (roleHint === 'SALES_ADMIN') {
    const adminEmp = await db.employee.findFirst({
      where: { OR: [{ employeeCode: 'NV007' }, { maNV: 'NV007' }] }
    });
    if (adminEmp) return adminEmp.id;
  } else if (roleHint === 'PRODUCT_ADMIN') {
    const prodEmp = await db.employee.findFirst({
      where: { OR: [{ employeeCode: 'NV009' }, { maNV: 'NV009' }] }
    });
    if (prodEmp) return prodEmp.id;
  } else if (roleHint === 'MANAGER') {
    const mgrEmp = await db.employee.findFirst({
      where: { OR: [{ employeeCode: 'NV010' }, { maNV: 'NV010' }] }
    });
    if (mgrEmp) return mgrEmp.id;
  }

  // 3. Fallback: find default Sales (NV001) or any employee in DB
  const defaultSales = await db.employee.findFirst({
    where: { OR: [{ employeeCode: 'NV001' }, { maNV: 'NV001' }] }
  });
  if (defaultSales) return defaultSales.id;

  const anyEmp = await db.employee.findFirst();
  if (anyEmp) return anyEmp.id;

  throw new Error('NO_EMPLOYEE_FOUND_IN_DATABASE');
}
