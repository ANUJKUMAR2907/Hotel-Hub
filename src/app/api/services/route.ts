import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isReceptionist } from '@/lib/auth';
import { z } from 'zod';

const requestSchema = z.object({
  bookingId: z.string(),
  serviceType: z.enum(['FOOD', 'LAUNDRY', 'ROOM_SERVICE']),
  description: z.string().min(3),
  quantity: z.number().int().positive().default(1),
  price: z.number().nonnegative().default(0), // Set to 0 if complimentary or filled by staff
});

// GET: List service requests
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');
    const status = searchParams.get('status');
    const serviceType = searchParams.get('serviceType');

    const whereClause: any = {};
    if (bookingId) whereClause.bookingId = bookingId;
    if (status) whereClause.status = status;
    if (serviceType) whereClause.serviceType = serviceType;

    // Security scope: Customers can only fetch service requests of their bookings
    if (user.role.name === 'CUSTOMER') {
      if (!user.customer) {
        return NextResponse.json({ success: true, services: [] });
      }
      whereClause.booking = {
        customerId: user.customer.id,
      };
    } else if (user.role.name === 'RECEPTIONIST') {
      // Receptionist sees service requests in their hotel
      if (user.employee?.hotelId) {
        whereClause.booking = {
          bookingRooms: {
            some: {
              room: { hotelId: user.employee.hotelId },
            },
          },
        };
      }
    }

    const services = await prisma.serviceRequest.findMany({
      where: whereClause,
      include: {
        booking: {
          include: {
            customer: { select: { name: true, phone: true } },
            bookingRooms: {
              include: {
                room: { select: { roomNumber: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Formatting response to match cleaner structure
    const formattedServices = services.map((s) => ({
      id: s.id,
      bookingId: s.bookingId,
      bookingNumber: s.booking.bookingNumber,
      customerName: s.booking.customer.name,
      roomNumber: s.booking.bookingRooms[0]?.room.roomNumber || 'N/A',
      serviceType: s.serviceType,
      description: s.description,
      quantity: s.quantity,
      price: s.price,
      status: s.status,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ success: true, services: formattedServices });
  } catch (error: any) {
    console.error('List services error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Place service request
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { customer: true },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    // Security scope: Customers can only order services for their own booking
    if (user.role.name === 'CUSTOMER' && booking.customer.userId !== user.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Standard prices if not set:
    let finalPrice = data.price;
    if (finalPrice === 0) {
      if (data.serviceType === 'FOOD') finalPrice = 250; // default food order price
      else if (data.serviceType === 'LAUNDRY') finalPrice = 120; // default laundry item cost
      else if (data.serviceType === 'ROOM_SERVICE') finalPrice = 0; // standard cleaning is free
    }

    const service = await prisma.serviceRequest.create({
      data: {
        bookingId: data.bookingId,
        serviceType: data.serviceType,
        description: data.description,
        quantity: data.quantity,
        price: finalPrice,
        status: 'PENDING',
      },
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'SERVICE_REQUEST_CREATE',
        details: `Created service request: ${data.serviceType} (${data.description}) for booking ${booking.bookingNumber}`,
      },
    });

    return NextResponse.json({ success: true, service }, { status: 201 });
  } catch (error: any) {
    console.error('Create service error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
