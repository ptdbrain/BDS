import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sweepExpiredLocks } from '@/lib/locks';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export async function GET(request: Request) {
  try {
    await ensureDatabaseSeeded();
    // Sweep any expired locks before returning results
    await sweepExpiredLocks();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const building = searchParams.get('building');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const direction = searchParams.get('direction');

    const whereClause: any = {};

    if (projectId) whereClause.projectId = projectId;
    if (building) whereClause.building = building;
    if (status) whereClause.status = status;
    if (direction) whereClause.direction = direction;

    if (search) {
      whereClause.OR = [
        { productCode: { contains: search } },
        { building: { contains: search } }
      ];
    }

    const products = await db.product.findMany({
      where: whereClause,
      include: {
        project: true,
        productType: true,
        prices: {
          include: { paymentPlan: true }
        },
        locks: {
          where: { status: { in: ['ACTIVE', 'PAYMENT_PENDING'] } },
          include: { salesEmployee: true, payments: true }
        }
      },
      orderBy: [
        { building: 'asc' },
        { floor: 'desc' },
        { productCode: 'asc' }
      ]
    });

    // Summary counts by status (Đã cọc = Đã bán)
    const statusSummary = {
      TOTAL: products.length,
      AVAILABLE: products.filter(p => p.status === 'AVAILABLE' && p.trangthai !== 'Đã bán' && p.trangthai !== 'Đã cọc' && p.trangthai !== 'Check Admin' && p.trangthai !== 'Đã khớp').length,
      LOCKED: products.filter(p => p.status === 'LOCKED' && p.trangthai !== 'Đã bán' && p.trangthai !== 'Đã cọc' && p.trangthai !== 'Check Admin').length,
      SOLD: products.filter(p => p.status === 'SOLD' || p.status === 'DEPOSITED' || p.trangthai === 'Đã bán' || p.trangthai === 'Đã cọc' || p.trangthai === 'Check Admin').length,
      UNAVAILABLE: products.filter(p => p.status === 'UNAVAILABLE' || p.trangthai === 'CDT thu căn').length,
    };

    return NextResponse.json({
      data: products,
      summary: statusSummary,
      meta: {
        total: products.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId,
      productCode,
      building,
      floor,
      area,
      direction = 'Đông Nam',
      handoverPlan = 'Hoàn thiện cao cấp',
      status = 'AVAILABLE',
      amount,
      depositAmount = 100000000,
      productTypeId,
      actorId = 'emp_prod_01',
      actorName = 'Nguyễn Tiến Dũng',
      gianiemyet,
      giaTTS,
      giaTTC,
      giaVay
    } = body;

    if (!projectId || !productCode || !building || floor === undefined || !area || !amount) {
      return NextResponse.json({
        error: 'Vui lòng nhập đầy đủ các trường: Dự án, Mã căn, Tòa, Tầng, Diện tích và Giá niêm yết.'
      }, { status: 400 });
    }

    // Check duplicate productCode within project
    const existing = await db.product.findUnique({
      where: {
        projectId_productCode: {
          projectId,
          productCode: productCode.trim()
        }
      }
    });

    if (existing) {
      return NextResponse.json({
        error: `Mã căn ${productCode} đã tồn tại trong dự án này!`
      }, { status: 409 });
    }

    // Resolve or fallback productType
    let resolvedTypeId = productTypeId;
    if (!resolvedTypeId) {
      const defaultType = await db.productType.findFirst();
      resolvedTypeId = defaultType?.id;
    }

    if (!resolvedTypeId) {
      const newType = await db.productType.create({
        data: { code: 'TYPE-APT', name: 'Căn Hộ Cao Cấp', loaiSanpham: 'Căn Hộ Cao Cấp' }
      });
      resolvedTypeId = newType.id;
    }

    // Resolve default payment plan for project
    let paymentPlan = await db.paymentPlan.findFirst({
      where: { projectId }
    });

    if (!paymentPlan) {
      paymentPlan = await db.paymentPlan.create({
        data: {
          projectId,
          code: 'STD-DEFAULT',
          name: 'Thanh toán chuẩn theo tiến độ'
        }
      });
    }

    const numAmount = parseFloat(String(amount));
    const numGiaNiemyet = gianiemyet ? parseFloat(String(gianiemyet)) : numAmount;
    const numGiaTTS = giaTTS ? parseFloat(String(giaTTS)) : Math.round(numAmount * 0.90);
    const numGiaTTC = giaTTC ? parseFloat(String(giaTTC)) : numAmount;
    const numGiaVay = giaVay ? parseFloat(String(giaVay)) : Math.round(numAmount * 1.02);

    // Create product and price in a transaction
    const newProduct = await db.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          projectId,
          productTypeId: resolvedTypeId,
          productCode: productCode.trim().toUpperCase(),
          building: building.trim(),
          floor: parseInt(String(floor), 10),
          area: parseFloat(String(area)),
          direction: direction.trim(),
          handoverPlan: handoverPlan.trim(),
          status: status || 'AVAILABLE',
          // Class diagram fields (Sanpham)
          maCan: productCode.trim().toUpperCase(),
          dientich: parseFloat(String(area)),
          huong: direction.trim(),
          gianiemyet: numGiaNiemyet,
          giaTTS: numGiaTTS,
          giaTTC: numGiaTTC,
          giaVay: numGiaVay,
          trangthai: status || 'AVAILABLE'
        }
      });

      await tx.productPrice.create({
        data: {
          productId: prod.id,
          paymentPlanId: paymentPlan.id,
          amount: numAmount,
          depositAmount: parseFloat(String(depositAmount))
        }
      });

      await tx.productStatusHistory.create({
        data: {
          productId: prod.id,
          fromStatus: 'INITIAL_CREATION',
          toStatus: status || 'AVAILABLE',
          reason: 'Thêm mới căn hộ vào quỹ hàng bởi Nhân viên QL Sản Phẩm',
          actorId
        }
      });

      return prod;
    });

    return NextResponse.json({
      message: 'Thêm căn hộ vào quỹ hàng thành công!',
      data: newProduct
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

