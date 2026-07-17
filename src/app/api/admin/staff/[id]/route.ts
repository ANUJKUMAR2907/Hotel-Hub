import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  hotelId: z.string().nullable().optional(),
  designation: z.enum(['RECEPTIONIST', 'MANAGER', 'CLEANING_STAFF', 'MAINTENANCE_STAFF']).optional(),
  salary: z.number().positive().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // employee ID
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    const data = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update User Details (if changed)
      const userUpdate: any = {};
      if (data.name) userUpdate.name = data.name;
      if (data.phone) userUpdate.phone = data.phone;
      if (data.status) userUpdate.status = data.status;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: employee.userId },
          data: userUpdate,
        });
      }

      // 2. Update Employee Details
      const employeeUpdate: any = {};
      if (data.hotelId !== undefined) employeeUpdate.hotelId = data.hotelId;
      if (data.designation) employeeUpdate.designation = data.designation;
      if (data.salary) employeeUpdate.salary = data.salary;

      const dbEmployee = await tx.employee.update({
        where: { id },
        data: employeeUpdate,
      });

      return dbEmployee;
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: any) {
    console.error('Update staff employee error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    // Deleting employee deletes User automatically due to prisma onDelete: Cascade on user? 
    // Wait, the relation in schema is Employee fields [userId] references User [id] on delete Cascade.
    // So deleting User will delete Employee. Deleting Employee won't delete User by default.
    // Let's delete the User to clean up everything!
    await prisma.user.delete({
      where: { id: employee.userId },
    });

    return NextResponse.json({ success: true, message: 'Employee and user profile deleted successfully' });
  } catch (error: any) {
    console.error('Delete staff employee error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
