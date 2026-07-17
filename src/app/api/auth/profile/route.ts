import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, hashPassword } from '@/lib/auth';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  address: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  password: z.string().min(6).optional(),
});

export async function PUT(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;
    const userUpdate: any = {};
    if (data.name) userUpdate.name = data.name;
    if (data.phone) userUpdate.phone = data.phone;
    if (data.password) {
      userUpdate.passwordHash = await hashPassword(data.password);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Update Core User Details
      const u = await tx.user.update({
        where: { id: user.id },
        data: userUpdate,
      });

      // 2. Update Customer Profile if present
      if (user.role.name === 'CUSTOMER') {
        const customerUpdate: any = {};
        if (data.name) customerUpdate.name = data.name;
        if (data.phone) customerUpdate.phone = data.phone;
        if (data.address !== undefined) customerUpdate.address = data.address;
        if (data.documentType !== undefined) customerUpdate.documentType = data.documentType;
        if (data.documentNumber !== undefined) customerUpdate.documentNumber = data.documentNumber;

        await tx.customer.update({
          where: { userId: user.id },
          data: customerUpdate,
        });
      }

      return u;
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: user.role.name,
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
