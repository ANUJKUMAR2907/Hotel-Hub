import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate inputs
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, phone } = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Get Customer Role
    const customerRole = await prisma.role.findFirst({
      where: { name: 'CUSTOMER' },
    });

    if (!customerRole) {
      return NextResponse.json(
        { success: false, message: 'System role setup incomplete. Please run /api/seed first.' },
        { status: 500 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Run in transaction to ensure atomic User + Customer creation
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
          phone,
          roleId: customerRole.id,
          status: 'ACTIVE',
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          name,
          email,
          phone,
        },
      });

      // Audit Log
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTER',
          details: `Registered account: ${email} as Customer`,
        },
      });

      return { user, customer };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account registered successfully',
        userId: result.user.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
