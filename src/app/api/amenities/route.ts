import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const amenitySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().default('HelpCircle'),
});

export async function GET() {
  try {
    const amenities = await prisma.amenity.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ success: true, amenities });
  } catch (error: any) {
    console.error('List amenities error:', error);
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
    const parsed = amenitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, icon } = parsed.data;

    const duplicate = await prisma.amenity.findUnique({ where: { name } });
    if (duplicate) {
      return NextResponse.json({ success: false, message: 'Amenity name already exists' }, { status: 400 });
    }

    const amenity = await prisma.amenity.create({
      data: { name, description, icon },
    });

    return NextResponse.json({ success: true, amenity }, { status: 201 });
  } catch (error: any) {
    console.error('Create amenity error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
