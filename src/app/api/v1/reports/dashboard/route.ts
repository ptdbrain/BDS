import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sweepExpiredLocks } from '@/lib/locks';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    await sweepExpiredLocks();

    const [
      totalProducts,
      availableProducts,
      lockedProducts,
      depositedProducts,
      soldProducts,
      contracts,
      succeededPayments,
      employees
    ] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { status: 'AVAILABLE' } }),
      db.product.count({ where: { status: 'LOCKED' } }),
      db.product.count({ where: { status: 'DEPOSITED' } }),
      db.product.count({ where: { status: 'SOLD' } }),
      db.contract.findMany({ include: { product: true, salesEmployee: true } }),
      db.paymentTransaction.findMany({ where: { status: 'SUCCEEDED' } }),
      db.employee.findMany({ include: { _count: { select: { locks: true, contracts: true } } } })
    ]);

    // Calculate actual revenue strictly from real database transactions and contracts
    const totalDepositRevenue = succeededPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalContractRevenue = contracts.reduce((acc, c) => acc + c.agreedPrice, 0);

    // Sales Leaderboard derived strictly from actual contract transactions
    const leaderboard = employees.map(emp => {
      const empContracts = contracts.filter(c => c.salesEmployeeId === emp.id);
      const empRevenue = empContracts.reduce((acc, c) => acc + c.agreedPrice, 0);
      return {
        id: emp.id,
        fullName: emp.fullName,
        jobTitle: emp.jobTitle,
        locksCount: emp._count.locks,
        contractsCount: empContracts.length,
        totalRevenue: empRevenue
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Revenue by project strictly calculated from database aggregates
    const projects = await db.project.findMany({
      include: {
        products: {
          include: { contracts: true, locks: { include: { payments: true } } }
        }
      }
    });

    const revenueByProject = projects.map(proj => {
      const projSoldRevenue = proj.products.reduce((sum, p) => {
        const prodContracts = p.contracts.filter(c => c.status === 'SIGNED' || c.status === 'APPROVED');
        return sum + prodContracts.reduce((cSum, c) => cSum + c.agreedPrice, 0);
      }, 0);

      const projDepositRevenue = proj.products.reduce((sum, p) => {
        const succeeded = p.locks.flatMap(l => l.payments).filter(pay => pay.status === 'SUCCEEDED');
        return sum + succeeded.reduce((paySum, pay) => paySum + pay.amount, 0);
      }, 0);

      const projDepositCount = proj.products.filter(p => p.status === 'DEPOSITED' || p.status === 'SOLD').length;

      return {
        projectId: proj.id,
        projectName: proj.name,
        totalUnits: proj.products.length,
        depositedUnits: projDepositCount,
        depositRevenue: projDepositRevenue,
        contractRevenue: projSoldRevenue,
        revenue: projSoldRevenue + projDepositRevenue // Total actual realized revenue
      };
    });

    return NextResponse.json({
      data: {
        kpis: {
          totalProducts,
          availableProducts,
          lockedProducts,
          depositedProducts,
          soldProducts,
          totalDepositRevenue,
          totalContractRevenue,
          activeLocksCount: lockedProducts,
          conversionRate: totalProducts > 0 ? (((depositedProducts + soldProducts) / totalProducts) * 100).toFixed(1) : '0'
        },
        revenueByProject,
        leaderboard,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
