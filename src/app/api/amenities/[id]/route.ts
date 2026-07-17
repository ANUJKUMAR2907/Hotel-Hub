import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const amenity = await prisma.amenity.findUnique({ where: { id } });
    if (!amenity) {
      return NextResponse.json({ success: false, message: 'Amenity not found' }, { status: 404 });
    }

    const updated = await prisma.amenity.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, amenity: updated });
  } catch (error: any) {
    console.error('Update amenity error:', error);
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

    const amenity = await prisma.amenity.findUnique({ where: { id } });
    if (!amenity) {
      return NextResponse.json({ success: false, message: 'Amenity not found' }, { status: 404 });
    }

    await prisma.amenity.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Amenity deleted successfully' });
  } catch (error: any) {
    console.error('Delete amenity error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
