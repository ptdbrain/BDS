import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { verifyVietQRWebhookSignature } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const signature =
      request.headers.get('X-Provider-Signature') ||
      request.headers.get('X-VietQR-Signature');

    const isSignatureValid = verifyVietQRWebhookSignature(rawBody, signature);

    const {
      eventId = `evt_${Date.now()}`,
      providerReference,
      amount,
      paidAt = new Date().toISOString(),
      eventType = 'payment.succeeded'
    } = body;

    if (!providerReference || !amount) {
      return NextResponse.json({ error: 'Missing providerReference or amount' }, { status: 400 });
    }

    // 1. Idempotency Check for Webhook Events
    const existingEvent = await db.paymentWebhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: 'VIETQR_AHS',
          providerEventId: eventId
        }
      }
    });

    if (existingEvent) {
      return NextResponse.json({
        message: 'Duplicate webhook event received and acknowledged safely',
        status: 'DUPLICATE_IGNORED'
      }, { status: 200 });
    }

    // Record raw webhook event with signature status
    await db.paymentWebhookEvent.create({
      data: {
        provider: 'VIETQR_AHS',
        providerEventId: eventId,
        signatureValid: isSignatureValid,
        payloadEncrypted: rawBody,
        receivedAt: new Date(),
        processingStatus: 'PROCESSED'
      }
    });

    // 2. Find Payment Transaction
    const payment = await db.paymentTransaction.findUnique({
      where: { providerReference },
      include: { lock: { include: { product: true } } }
    });

    if (!payment) {
      return NextResponse.json({
        type: 'urn:ahs:problem:payment-not-found',
        title: 'Không tìm thấy giao dịch',
        status: 404,
        code: 'PAYMENT_NOT_FOUND',
        detail: `Không tìm thấy thông tin chuyển khoản cọc với mã tham chiếu: ${providerReference}`
      }, { status: 404 });
    }

    const now = new Date();
    const isExpired = payment.expiresAt < now;
    const isAmountMismatch = Number(amount) !== Number(payment.amount);

    if (isAmountMismatch || isExpired || !isSignatureValid) {
      const reason = !isSignatureValid
        ? 'Chữ ký Webhook không hợp lệ (Cảnh báo bảo mật)'
        : isAmountMismatch
        ? 'Chênh lệch số tiền cọc so với niêm yết'
        : 'Tiền chuyển đến sau khi đã hết thời gian giữ căn 30 phút';

      // Mark payment for manual reconciliation
      await db.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: 'REVIEW_REQUIRED',
          paidAt: new Date(paidAt),
          rawSummary: `Chuyển tiền gặp ngoại lệ đối soát: ${reason}`
        }
      });

      await createAuditLog({
        actorId: 'VIETQR_WEBHOOK',
        actorName: 'Cổng Thanh Toán VietQR',
        action: 'PAYMENT_RECONCILIATION_REQUIRED',
        entityType: 'PAYMENT_TRANSACTION',
        entityId: payment.id,
        afterJson: { isExpired, isAmountMismatch, isSignatureValid, receivedAmount: amount, expectedAmount: payment.amount }
      });

      return NextResponse.json({
        status: 'REVIEW_REQUIRED',
        message: `Giao dịch đã ghi nhận nhưng cần Sales Admin đối soát: ${reason}`,
        data: { paymentId: payment.id }
      }, { status: 200 }); // Return 200 to gateway to avoid retry flood
    }

    // 3. Normal Success Path
    await db.$transaction(async (tx) => {
      // Update payment -> SUCCEEDED
      await tx.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(paidAt),
          rawSummary: 'Xác nhận cọc VietQR thành công tự động'
        }
      });

      // Update Lock -> DEPOSIT_CONFIRMED
      await tx.productLock.update({
        where: { id: payment.lockId },
        data: {
          status: 'DEPOSIT_CONFIRMED',
          depositConfirmedAt: new Date(paidAt)
        }
      });

      // Update Product -> DEPOSITED
      await tx.product.update({
        where: { id: payment.lock.productId },
        data: {
          status: 'DEPOSITED',
          version: { increment: 1 }
        }
      });

      // History log
      await tx.productStatusHistory.create({
        data: {
          productId: payment.lock.productId,
          fromStatus: 'LOCKED',
          toStatus: 'DEPOSITED',
          reason: `Xác nhận chuyển cọc thành công ${Number(amount).toLocaleString('vi-VN')} VND qua VietQR`,
          actorId: 'VIETQR_GATEWAY'
        }
      });
    });

    await createAuditLog({
      actorId: 'VIETQR_WEBHOOK',
      actorName: 'Cổng Thanh Toán VietQR',
      action: 'CONFIRM_DEPOSIT_PAYMENT',
      entityType: 'PAYMENT_TRANSACTION',
      entityId: payment.id,
      afterJson: { amount, paidAt }
    });

    return NextResponse.json({
      status: 'SUCCEEDED',
      message: 'Xác nhận cọc thành công!',
      data: {
        paymentId: payment.id,
        productId: payment.lock.productId,
        status: 'DEPOSITED'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
