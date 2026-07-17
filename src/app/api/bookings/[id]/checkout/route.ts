import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isReceptionist } from '@/lib/auth';
import { generateQRCode } from '@/lib/qrcode';
import { z } from 'zod';

const checkoutSchema = z.object({
  lateCheckoutCharges: z.number().nonnegative().default(0),
  damageCharges: z.number().nonnegative().default(0),
  extraPaymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'NET_BANKING', 'ONLINE']).default('CASH'),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || !isReceptionist(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { lateCheckoutCharges, damageCharges, extraPaymentMethod } = parsed.data;

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        payments: true,
        bookingRooms: { include: { room: true } },
        serviceRequests: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'CHECKED_IN') {
      return NextResponse.json({ success: false, message: 'Cannot checkout a booking that is not checked in' }, { status: 400 });
    }

    // 1. Calculate Food and Laundry Service Charges
    let foodCharges = 0;
    let laundryCharges = 0;
    let otherServiceCharges = 0;

    for (const sr of booking.serviceRequests) {
      if (sr.status === 'COMPLETED' || sr.status === 'PENDING') {
        const itemCost = sr.price * sr.quantity;
        if (sr.serviceType === 'FOOD') {
          foodCharges += itemCost;
        } else if (sr.serviceType === 'LAUNDRY') {
          laundryCharges += itemCost;
        } else {
          otherServiceCharges += itemCost;
        }
      }
    }

    const serviceCharges = foodCharges + laundryCharges + otherServiceCharges;

    // 2. Billing Breakdown & Tax Recalculation
    const roomCharges = booking.totalAmount; // Base room price * nights
    const discount = booking.discountAmount;
    const extraCharges = lateCheckoutCharges + damageCharges + serviceCharges;
    const taxableAmount = roomCharges - discount + extraCharges;

    // Tax calculation
    const activeTaxes = await prisma.tax.findMany({ where: { isActive: true } });
    const taxRateSum = activeTaxes.reduce((sum, tax) => sum + tax.rate, 0);
    const taxAmount = (taxableAmount * taxRateSum) / 100;
    const totalBillAmount = taxableAmount + taxAmount;

    // 3. Compute Paid & Outstanding Balances
    const totalPaidAlready = booking.payments
      .filter((p) => p.paymentStatus === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    const outstandingBalance = totalBillAmount - totalPaidAlready;

    const invoice = await prisma.$transaction(async (tx) => {
      // Create additional payment if outstanding balance exists
      if (outstandingBalance > 0.01) {
        await tx.payment.create({
          data: {
            bookingId: id,
            amount: outstandingBalance,
            paymentMethod: extraPaymentMethod,
            paymentStatus: 'SUCCESS',
            transactionId: `pay_tx_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          },
        });
      }

      // Update Booking
      await tx.booking.update({
        where: { id },
        data: {
          status: 'CHECKED_OUT',
          paymentStatus: 'PAID',
          finalAmount: totalBillAmount,
          taxAmount: taxAmount,
        },
      });

      // Update rooms status to Cleaning
      for (const br of booking.bookingRooms) {
        await tx.room.update({
          where: { id: br.roomId },
          data: {
            status: 'Cleaning',
            cleaningStatus: 'Dirty', // Needs cleaning
          },
        });
      }

      // Generate invoice number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${dateStr}-${randomId}`;

      // Generate scannable QR code text
      const qrPayload = JSON.stringify({
        invoice: invoiceNumber,
        booking: booking.bookingNumber,
        customer: booking.customer.name,
        amount: totalBillAmount,
        date: new Date().toLocaleDateString(),
      });
      const qrCodeBase64 = await generateQRCode(qrPayload);

      // Create Invoice
      const dbInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          bookingId: id,
          roomCharges,
          serviceCharges,
          lateCheckoutCharges,
          foodCharges,
          laundryCharges,
          damageCharges,
          taxAmount,
          discountAmount: discount,
          totalAmount: totalBillAmount,
          qrCode: qrCodeBase64,
        },
      });

      // Audit Log
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'CUSTOMER_CHECK_OUT',
          details: `Checked out booking ${booking.bookingNumber}. Invoice ${invoiceNumber} generated. Total: ₹${totalBillAmount.toFixed(2)}`,
        },
      });

      return dbInvoice;
    });

    return NextResponse.json({
      success: true,
      message: 'Checkout completed and invoice generated successfully.',
      invoice,
    });
  } catch (error: any) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
