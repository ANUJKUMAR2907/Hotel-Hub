import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isReceptionist } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !isReceptionist(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Resolve receptionist hotelId
    const hotelId = user.employee?.hotelId;
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Receptionist is not assigned to any hotel.' }, { status: 400 });
    }

    // 1. Live Room Status Counts
    const rooms = await prisma.room.findMany({
      where: { hotelId },
    });

    const statusCounts = {
      Available: rooms.filter((r) => r.status === 'Available').length,
      Booked: rooms.filter((r) => r.status === 'Booked').length,
      Occupied: rooms.filter((r) => r.status === 'Occupied').length,
      Cleaning: rooms.filter((r) => r.status === 'Cleaning').length,
      Maintenance: rooms.filter((r) => r.status === 'Maintenance').length,
      Blocked: rooms.filter((r) => r.status === 'Blocked').length,
      total: rooms.length,
    };

    // 2. Bookings Due Today (Checkins and Checkouts)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Checkins Due Today (Check-in date is today and status is CONFIRMED or PENDING)
    const checkinsDue = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        checkInDate: {
          gte: today,
          lt: tomorrow,
        },
        bookingRooms: {
          some: { room: { hotelId } },
        },
      },
      include: {
        customer: true,
        bookingRooms: { include: { room: true } },
      },
    });

    // Checkouts Due Today (Check-out date is today and status is CHECKED_IN)
    const checkoutsDue = await prisma.booking.findMany({
      where: {
        status: 'CHECKED_IN',
        checkOutDate: {
          gte: today,
          lt: tomorrow,
        },
        bookingRooms: {
          some: { room: { hotelId } },
        },
      },
      include: {
        customer: true,
        bookingRooms: { include: { room: true } },
      },
    });

    // 3. Pending Room Services
    const pendingServices = await prisma.serviceRequest.findMany({
      where: {
        status: 'PENDING',
        booking: {
          bookingRooms: {
            some: { room: { hotelId } },
          },
        },
      },
      include: {
        booking: {
          include: {
            bookingRooms: { include: { room: true } },
          },
        },
      },
      take: 5,
    });

    const formattedServices = pendingServices.map((s) => ({
      id: s.id,
      roomNumber: s.booking.bookingRooms[0]?.room.roomNumber || 'N/A',
      serviceType: s.serviceType,
      description: s.description,
      quantity: s.quantity,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      success: true,
      hotelId,
      statusCounts,
      checkinsDue: checkinsDue.map((c) => ({
        id: c.id,
        bookingNumber: c.bookingNumber,
        customerName: c.customer.name,
        customerPhone: c.customer.phone,
        roomNumber: c.bookingRooms[0]?.room.roomNumber || 'TBD',
        paymentStatus: c.paymentStatus,
        status: c.status,
      })),
      checkoutsDue: checkoutsDue.map((c) => ({
        id: c.id,
        bookingNumber: c.bookingNumber,
        customerName: c.customer.name,
        customerPhone: c.customer.phone,
        roomNumber: c.bookingRooms[0]?.room.roomNumber || 'N/A',
        paymentStatus: c.paymentStatus,
        status: c.status,
      })),
      pendingServices: formattedServices,
    });
  } catch (error: any) {
    console.error('Receptionist status API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
