import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import { z } from 'zod';

const hotelSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  images: z.array(z.string()).min(1, 'At least one image is required'),
});

// GET: List all hotels
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const status = searchParams.get('status'); // e.g. ACTIVE, INACTIVE

    // Authenticate to check if caller is admin (allows seeing inactive hotels)
    const currentUser = await getUserFromRequest(req);
    const adminRequest = currentUser && isSuperAdmin(currentUser);

    const whereClause: any = {};
    if (city) {
      whereClause.city = { contains: city };
    }
    if (status) {
      whereClause.status = status;
    } else if (!adminRequest) {
      whereClause.status = 'ACTIVE'; // default for customers
    }

    const hotels = await prisma.hotel.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, hotels });
  } catch (error: any) {
    console.error('List hotels error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new hotel (Admin only)
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = hotelSchema.safeParse(body);
    
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
      const url = await uploadImage(img, 'hotels');
      uploadedImages.push(url);
    }

    const hotel = await prisma.hotel.create({
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        email: data.email,
        phone: data.phone,
        images: uploadedImages.join(','),
        status: 'ACTIVE',
      },
    });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'HOTEL_CREATE',
        details: `Created hotel ${data.name} (ID: ${hotel.id})`,
      },
    });

    return NextResponse.json({ success: true, hotel }, { status: 201 });
  } catch (error: any) {
    console.error('Create hotel error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
