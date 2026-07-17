import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isReceptionist, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  price: z.number().nonnegative().optional(),
  description: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || !isReceptionist(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const service = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!service) {
      return NextResponse.json({ success: false, message: 'Service request not found' }, { status: 404 });
    }

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: parsed.data,
    });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'SERVICE_REQUEST_UPDATE',
        details: `Updated service request status to ${updated.status} (ID: ${id}) for booking ${service.booking.bookingNumber}`,
      },
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (error: any) {
    console.error('Update service error:', error);
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

    const service = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!service) {
      return NextResponse.json({ success: false, message: 'Service request not found' }, { status: 404 });
    }

    await prisma.serviceRequest.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Service request deleted successfully' });
  } catch (error: any) {
    console.error('Delete service error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
