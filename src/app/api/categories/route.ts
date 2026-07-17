import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import { z } from 'zod';

const categorySchema = z.object({
  hotelId: z.string(),
  name: z.string().min(2),
  description: z.string().min(10),
  pricePerNight: z.number().positive(),
  maxGuests: z.number().int().positive(),
  hasAC: z.boolean().default(true),
  images: z.array(z.string()).min(1, 'At least one image is required'),
  amenityIds: z.array(z.string()).optional(), // List of amenity IDs to link
});

// GET: List room categories
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get('hotelId');

    const whereClause: any = {};
    if (hotelId) {
      whereClause.hotelId = hotelId;
    }

    const categories = await prisma.roomCategory.findMany({
      where: whereClause,
      include: {
        hotel: { select: { name: true, city: true } },
        roomAmenities: {
          include: { amenity: true },
        },
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { pricePerNight: 'asc' },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error('List room categories error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new room category (Admin only)
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Process and upload images
    const uploadedImages: string[] = [];
    for (const img of data.images) {
      const url = await uploadImage(img, 'categories');
      uploadedImages.push(url);
    }

    // Run transaction
    const category = await prisma.$transaction(async (tx) => {
      const dbCat = await tx.roomCategory.create({
        data: {
          hotelId: data.hotelId,
          name: data.name,
          description: data.description,
          pricePerNight: data.pricePerNight,
          maxGuests: data.maxGuests,
          hasAC: data.hasAC,
          images: uploadedImages.join(','),
        },
      });

      // Link amenities if any
      if (data.amenityIds && data.amenityIds.length > 0) {
        const linkData = data.amenityIds.map((id) => ({
          categoryId: dbCat.id,
          amenityId: id,
        }));
        await tx.roomCategoryAmenity.createMany({
          data: linkData,
        });
      }

      return dbCat;
    });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CATEGORY_CREATE',
        details: `Created category: ${data.name} for hotel: ${data.hotelId}`,
      },
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
