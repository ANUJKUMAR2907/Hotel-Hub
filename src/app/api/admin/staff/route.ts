import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin, hashPassword } from '@/lib/auth';
import { z } from 'zod';

const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10),
  hotelId: z.string().nullable(), // Null for global admin, set for receptionist
  designation: z.enum(['RECEPTIONIST', 'MANAGER', 'CLEANING_STAFF', 'MAINTENANCE_STAFF']),
  salary: z.number().positive(),
});

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const staff = await prisma.employee.findMany({
      include: {
        user: {
          select: { name: true, email: true, phone: true, status: true },
        },
        hotel: {
          select: { name: true, city: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedStaff = staff.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.user.name,
      email: s.user.email,
      phone: s.user.phone,
      status: s.user.status,
      hotelId: s.hotelId,
      hotelName: s.hotel?.name || 'Global Operations',
      designation: s.designation,
      salary: s.salary,
      dateOfJoining: s.dateOfJoining,
    }));

    return NextResponse.json({ success: true, staff: formattedStaff });
  } catch (error: any) {
    console.error('List staff error:', error);
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
    const parsed = staffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json({ success: false, message: 'Email address already registered' }, { status: 400 });
    }

    // Fetch RECEPTIONIST role (typically roleId 2, but query dynamically)
    const role = await prisma.role.findFirst({
      where: { name: 'RECEPTIONIST' },
    });

    if (!role) {
      return NextResponse.json({ success: false, message: 'Receptionist role ID not seeded' }, { status: 500 });
    }

    const passwordHash = await hashPassword(data.password);

    const employee = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const dbUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          passwordHash,
          roleId: role.id,
          status: 'ACTIVE',
        },
      });

      // 2. Create Employee Profile
      const dbEmployee = await tx.employee.create({
        data: {
          userId: dbUser.id,
          hotelId: data.hotelId,
          designation: data.designation,
          salary: data.salary,
        },
      });

      // 3. Log Action
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'STAFF_CREATE',
          details: `Registered staff ${data.name} as ${data.designation} at hotel ${data.hotelId || 'Global'}`,
        },
      });

      return dbEmployee;
    });

    return NextResponse.json({ success: true, employee }, { status: 201 });
  } catch (error: any) {
    console.error('Create staff error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
