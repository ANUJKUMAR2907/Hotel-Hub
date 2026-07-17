import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  pricePerNight: z.number().positive().optional(),
  maxGuests: z.number().int().positive().optional(),
  hasAC: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  amenityIds: z.array(z.string()).optional(),
});

// GET: Fetch details
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const category = await prisma.roomCategory.findUnique({
      where: { id },
      include: {
        hotel: { select: { name: true, city: true } },
        roomAmenities: {
          include: { amenity: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ success: false, message: 'Room category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error('Fetch category details error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update category
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

    const category = await prisma.roomCategory.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ success: false, message: 'Room category not found' }, { status: 404 });
    }

    const data = parsed.data;
    const updateData: any = { ...data };
    delete updateData.amenityIds; // Handled separately

    if (data.images) {
      const uploadedImages: string[] = [];
      for (const img of data.images) {
        const url = await uploadImage(img, 'categories');
        uploadedImages.push(url);
      }
      updateData.images = uploadedImages.join(',');
    }

    const updatedCategory = await prisma.$transaction(async (tx) => {
      const dbCat = await tx.roomCategory.update({
        where: { id },
        data: updateData,
      });

      // Synchronize amenities if provided
      if (data.amenityIds !== undefined) {
        // Delete current linkages
        await tx.roomCategoryAmenity.deleteMany({
          where: { categoryId: id },
        });

        // Insert new linkages
        if (data.amenityIds.length > 0) {
          const linkages = data.amenityIds.map((amenityId) => ({
            categoryId: id,
            amenityId,
          }));
          await tx.roomCategoryAmenity.createMany({
            data: linkages,
          });
        }
      }

      return dbCat;
    });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CATEGORY_UPDATE',
        details: `Updated room category: ${updatedCategory.name} (ID: ${id})`,
      },
    });

    return NextResponse.json({ success: true, category: updatedCategory });
  } catch (error: any) {
    console.error('Update room category error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete category
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const category = await prisma.roomCategory.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ success: false, message: 'Room category not found' }, { status: 404 });
    }

    await prisma.roomCategory.delete({ where: { id } });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CATEGORY_DELETE',
        details: `Deleted room category: ${category.name} (ID: ${id})`,
      },
    });

    return NextResponse.json({ success: true, message: 'Room category deleted successfully' });
  } catch (error: any) {
    console.error('Delete room category error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
