import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isReceptionist, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  categoryId: z.string().optional(),
  roomNumber: z.string().min(1).optional(),
  status: z.enum(['Available', 'Booked', 'Occupied', 'Cleaning', 'Maintenance', 'Blocked']).optional(),
  cleaningStatus: z.enum(['Clean', 'Dirty', 'Cleaning']).optional(),
});

// GET: Fetch room details
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        hotel: { select: { name: true, city: true } },
        category: { select: { name: true, pricePerNight: true, maxGuests: true, hasAC: true } },
      },
    });

    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error('Fetch room error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update room (Admin / Receptionist)
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
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
    }

    const data = parsed.data;

    // Check duplicate room number if it's changing
    if (data.roomNumber && data.roomNumber !== room.roomNumber) {
      const duplicate = await prisma.room.findUnique({
        where: {
          hotelId_roomNumber: {
            hotelId: room.hotelId,
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
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: data,
    });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'ROOM_UPDATE',
        details: `Updated room ${room.roomNumber} -> status: ${updatedRoom.status}, cleaning: ${updatedRoom.cleaningStatus}`,
      },
    });

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error: any) {
    console.error('Update room error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete room (Admin only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
    }

    await prisma.room.delete({ where: { id } });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'ROOM_DELETE',
        details: `Deleted room ${room.roomNumber} (ID: ${id}) from hotel ${room.hotelId}`,
      },
    });

    return NextResponse.json({ success: true, message: 'Room deleted successfully' });
  } catch (error: any) {
    console.error('Delete room error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
