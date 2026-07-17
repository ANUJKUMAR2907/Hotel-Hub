import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isReceptionist } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || !isReceptionist(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { bookingRooms: { include: { room: true } } },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'CHECKED_IN') {
      return NextResponse.json({ success: false, message: 'Customer already checked in' }, { status: 400 });
    }

    if (booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED') {
      return NextResponse.json({ success: false, message: `Cannot check in. Booking is ${booking.status}` }, { status: 400 });
    }

    // Process check-in inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update booking status
      await tx.booking.update({
        where: { id },
        data: { status: 'CHECKED_IN' },
      });

      // 2. Update all assigned rooms status to Occupied
      for (const br of booking.bookingRooms) {
        await tx.room.update({
          where: { id: br.roomId },
          data: { status: 'Occupied' },
        });
      }

      // 3. Create activity log
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'CUSTOMER_CHECK_IN',
          details: `Checked in booking: ${booking.bookingNumber}, Rooms occupied: ${booking.bookingRooms.map((r) => r.room.roomNumber).join(', ')}`,
        },
      });
    });

    // Generate mock RFID Room key code
    const mockRoomKey = `RFID-${Math.random().toString(36).substring(2, 8).toUpperCase()}-R${booking.bookingRooms[0]?.room.roomNumber}`;

    return NextResponse.json({
      success: true,
      message: 'Check-in processed successfully',
      roomKey: mockRoomKey,
      roomNumber: booking.bookingRooms[0]?.room.roomNumber,
    });
  } catch (error: any) {
    console.error('Check-in API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
