import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// GET: Fetch a single hotel by ID
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        roomCategories: {
          include: {
            roomAmenities: {
              include: { amenity: true },
            },
          },
        },
        reviews: {
          where: { isApproved: true },
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, hotel });
  } catch (error: any) {
    console.error('Fetch hotel details error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update a hotel (Admin only)
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
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 });
    }

    const data = parsed.data;
    const updateData: any = { ...data };

    // If new images list is provided, process/upload
    if (data.images) {
      const uploadedImages: string[] = [];
      for (const img of data.images) {
        const url = await uploadImage(img, 'hotels');
        uploadedImages.push(url);
      }
      updateData.images = uploadedImages.join(',');
    }

    const updatedHotel = await prisma.hotel.update({
      where: { id },
      data: updateData,
    });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'HOTEL_UPDATE',
        details: `Updated hotel: ${updatedHotel.name} (ID: ${id})`,
      },
    });

    return NextResponse.json({ success: true, hotel: updatedHotel });
  } catch (error: any) {
    console.error('Update hotel error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a hotel (Admin only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 });
    }

    await prisma.hotel.delete({ where: { id } });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'HOTEL_DELETE',
        details: `Deleted hotel: ${hotel.name} (ID: ${id})`,
      },
    });

    return NextResponse.json({ success: true, message: 'Hotel deleted successfully' });
  } catch (error: any) {
    console.error('Delete hotel error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
