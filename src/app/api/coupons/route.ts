import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const couponSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FLAT']),
  discountValue: z.number().positive(),
  minBookingAmount: z.number().nonnegative().default(0),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().default(true),
  maxUses: z.number().int().positive().default(100),
});

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    const isAdmin = user && isSuperAdmin(user);

    const whereClause: any = {};
    if (!isAdmin) {
      whereClause.isActive = true;
      whereClause.endDate = { gte: new Date() };
    }

    const coupons = await prisma.coupon.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, coupons });
  } catch (error: any) {
    console.error('List coupons error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    // Check duplicate code
    const duplicate = await prisma.coupon.findUnique({
      where: { code: data.code },
    });

    if (duplicate) {
      return NextResponse.json({ success: false, message: `Coupon code '${data.code}' already exists` }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minBookingAmount: data.minBookingAmount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive,
        maxUses: data.maxUses,
      },
    });

    return NextResponse.json({ success: true, coupon }, { status: 201 });
  } catch (error: any) {
    console.error('Create coupon error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
