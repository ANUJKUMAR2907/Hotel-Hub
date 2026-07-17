import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isReceptionist, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const roomSchema = z.object({
  hotelId: z.string(),
  categoryId: z.string(),
  roomNumber: z.string().min(1),
  status: z.enum(['Available', 'Booked', 'Occupied', 'Cleaning', 'Maintenance', 'Blocked']).default('Available'),
  cleaningStatus: z.enum(['Clean', 'Dirty', 'Cleaning']).default('Clean'),
});

// GET: List rooms
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get('hotelId');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const cleaningStatus = searchParams.get('cleaningStatus');

    const whereClause: any = {};
    if (hotelId) whereClause.hotelId = hotelId;
    if (categoryId) whereClause.categoryId = categoryId;
    if (status) whereClause.status = status;
    if (cleaningStatus) whereClause.cleaningStatus = cleaningStatus;

    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        hotel: { select: { name: true, city: true } },
        category: { select: { name: true, pricePerNight: true, hasAC: true } },
      },
      orderBy: [{ hotelId: 'asc' }, { roomNumber: 'asc' }],
    });

    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    console.error('List rooms error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new room (Admin/Receptionist)
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !isReceptionist(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = roomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if room number already exists in this hotel
    const duplicate = await prisma.room.findUnique({
      where: {
        hotelId_roomNumber: {
          hotelId: data.hotelId,
          roomNumber: data.roomNumber,
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: `Room number ${data.roomNumber} already exists in this hotel.` },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        hotelId: data.hotelId,
        categoryId: data.categoryId,
        roomNumber: data.roomNumber,
        status: data.status,
        cleaningStatus: data.cleaningStatus,
      },
    });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'ROOM_CREATE',
        details: `Created room ${data.roomNumber} (ID: ${room.id}) at hotel ${data.hotelId}`,
      },
    });

    return NextResponse.json({ success: true, room }, { status: 201 });
  } catch (error: any) {
    console.error('Create room error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
