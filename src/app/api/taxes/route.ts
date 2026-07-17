import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const taxSchema = z.object({
  name: z.string().min(2),
  rate: z.number().positive(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const taxes = await prisma.tax.findMany({
      orderBy: { rate: 'asc' },
    });
    return NextResponse.json({ success: true, taxes });
  } catch (error: any) {
    console.error('List taxes error:', error);
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
    const parsed = taxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, rate, isActive } = parsed.data;

    const duplicate = await prisma.tax.findUnique({ where: { name } });
    if (duplicate) {
      return NextResponse.json({ success: false, message: 'Tax type already exists.' }, { status: 400 });
    }

    const tax = await prisma.tax.create({
      data: { name, rate, isActive },
    });

    return NextResponse.json({ success: true, tax }, { status: 201 });
  } catch (error: any) {
    console.error('Create tax error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
