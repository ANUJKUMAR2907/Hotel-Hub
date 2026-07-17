import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const verifySchema = z.object({
  code: z.string().toUpperCase(),
  amount: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid code or amount' }, { status: 400 });
    }

    const { code, amount } = parsed.data;

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, message: 'Invalid coupon code.' }, { status: 400 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ success: false, message: 'This coupon is no longer active.' }, { status: 400 });
    }

    const now = new Date();
    if (now < new Date(coupon.startDate) || now > new Date(coupon.endDate)) {
      return NextResponse.json({ success: false, message: 'This coupon has expired.' }, { status: 400 });
    }

    if (coupon.usesCount >= coupon.maxUses) {
      return NextResponse.json({ success: false, message: 'Coupon usage limit reached.' }, { status: 400 });
    }

    if (amount < coupon.minBookingAmount) {
      return NextResponse.json(
        { success: false, message: `Minimum booking amount of ₹${coupon.minBookingAmount} required to use this coupon.` },
        { status: 400 }
      );
    }

    let discountAmount = 0.0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (amount * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    // Cap discount to amount itself
    if (discountAmount > amount) discountAmount = amount;

    return NextResponse.json({
      success: true,
      message: 'Coupon applied successfully!',
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalAmount: amount - discountAmount,
    });
  } catch (error: any) {
    console.error('Verify coupon error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
