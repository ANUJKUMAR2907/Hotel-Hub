import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isReceptionist, isSuperAdmin } from '@/lib/auth';
import { createRazorpayOrder } from '@/lib/razorpay';
import { sendBookingConfirmationEmail } from '@/lib/mail';
import { z } from 'zod';

const bookingSchema = z.object({
  customerId: z.string().optional(), // Nullable if registering a new profile in receptionist panel
  hotelId: z.string(),
  categoryId: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  specialRequests: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'NET_BANKING', 'ONLINE']).default('ONLINE'),
  // Optional customer creation fields for walk-in receptionist booking
  guestName: z.string().optional(),
  guestEmail: z.string().optional(),
  guestPhone: z.string().optional(),
});

// GET: Retrieve bookings list
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;

    // Role-based scoping
    if (user.role.name === 'CUSTOMER') {
      // Customer only sees their bookings
      if (!user.customer) {
        return NextResponse.json({ success: true, bookings: [] });
      }
      whereClause.customerId = user.customer.id;
    } else if (user.role.name === 'RECEPTIONIST') {
      // Receptionist sees bookings in their hotel
      if (user.employee?.hotelId) {
        whereClause.bookingRooms = {
          some: {
            room: { hotelId: user.employee.hotelId },
          },
        };
      }
    }
    // SUPER_ADMIN sees everything

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        customer: true,
        bookingRooms: {
          include: {
            room: {
              include: {
                category: { select: { name: true } },
                hotel: { select: { name: true, city: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, bookings });
  } catch (error: any) {
    console.error('List bookings error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create booking
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const parsed = bookingSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);

    // 1. Resolve Customer ID
    let finalCustomerId = data.customerId;

    if (!finalCustomerId) {
      if (user && user.role.name === 'CUSTOMER') {
        if (!user.customer) {
          return NextResponse.json({ success: false, message: 'Customer profile not found' }, { status: 400 });
        }
        finalCustomerId = user.customer.id;
      } else if (user && isReceptionist(user)) {
        // Walk-in booking by Receptionist, create guest customer profile
        if (!data.guestName || !data.guestEmail || !data.guestPhone) {
          return NextResponse.json(
            { success: false, message: 'Guest contact details (name, email, phone) required for walk-in bookings' },
            { status: 400 }
          );
        }

        const newGuest = await prisma.customer.create({
          data: {
            name: data.guestName,
            email: data.guestEmail,
            phone: data.guestPhone,
            address: 'Walk-in Guest',
          },
        });
        finalCustomerId = newGuest.id;
      } else {
        return NextResponse.json({ success: false, message: 'Customer account information required' }, { status: 400 });
      }
    }

    // Fetch customer details
    const customer = await prisma.customer.findUnique({ where: { id: finalCustomerId } });
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer profile not resolved' }, { status: 404 });
    }

    // 2. Room Category Check
    const category = await prisma.roomCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      return NextResponse.json({ success: false, message: 'Room category not found' }, { status: 404 });
    }

    // 3. Find Available Rooms in that Category
    const allRooms = await prisma.room.findMany({
      where: {
        hotelId: data.hotelId,
        categoryId: data.categoryId,
        status: { notIn: ['Maintenance', 'Blocked'] },
      },
    });

    const overlappingBookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
        bookingRooms: {
          some: {
            room: {
              hotelId: data.hotelId,
              categoryId: data.categoryId,
            },
          },
        },
        AND: [
          { checkInDate: { lt: checkOut } },
          { checkOutDate: { gt: checkIn } },
        ],
      },
      include: {
        bookingRooms: true,
      },
    });

    const bookedRoomIds = new Set<string>();
    for (const ob of overlappingBookings) {
      for (const br of ob.bookingRooms) {
        bookedRoomIds.add(br.roomId);
      }
    }

    const availableRooms = allRooms.filter((room) => !bookedRoomIds.has(room.id));
    if (availableRooms.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No rooms available in this category for the selected dates.' },
        { status: 400 }
      );
    }

    // Reserve 1 room (default booking quantity)
    const selectedRoom = availableRooms[0];

    // 4. Cost Calculations
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const roomTotal = category.pricePerNight * diffDays;

    // A. Apply Coupon
    let discount = 0.0;
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: data.couponCode },
      });

      if (
        coupon &&
        coupon.isActive &&
        new Date() >= new Date(coupon.startDate) &&
        new Date() <= new Date(coupon.endDate) &&
        roomTotal >= coupon.minBookingAmount &&
        coupon.usesCount < coupon.maxUses
      ) {
        if (coupon.discountType === 'PERCENTAGE') {
          discount = (roomTotal * coupon.discountValue) / 100;
        } else {
          discount = coupon.discountValue;
        }
      }
    }

    // B. Calculate Taxes
    const activeTaxes = await prisma.tax.findMany({ where: { isActive: true } });
    const taxRateSum = activeTaxes.reduce((sum, tax) => sum + tax.rate, 0);
    const taxableAmount = roomTotal - discount;
    const taxAmount = (taxableAmount * taxRateSum) / 100;

    const finalAmount = taxableAmount + taxAmount;

    // Generate Booking Number e.g., GLH-20260716-1234
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const bookingNumber = `GLH-${datePrefix}-${randomSuffix}`;

    // 5. Save Booking inside Transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingNumber,
          customerId: finalCustomerId!,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: data.adults,
          children: data.children,
          specialRequests: data.specialRequests,
          totalAmount: roomTotal,
          discountAmount: discount,
          taxAmount,
          finalAmount,
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
      });

      // Create BookingRoom link
      await tx.bookingRoom.create({
        data: {
          bookingId: newBooking.id,
          roomId: selectedRoom.id,
          pricePerNight: category.pricePerNight,
        },
      });

      // Update room status
      await tx.room.update({
        where: { id: selectedRoom.id },
        data: { status: 'Booked' },
      });

      // If coupon was used, increment counter
      if (data.couponCode) {
        await tx.coupon.update({
          where: { code: data.couponCode },
          data: { usesCount: { increment: 1 } },
        }).catch(() => null); // handle gracefully if invalid code bypassed check
      }

      return newBooking;
    });

    // 6. Handle Payment Trigger
    let razorpayOrder = null;
    if (data.paymentMethod === 'ONLINE') {
      razorpayOrder = await createRazorpayOrder({
        amount: booking.finalAmount,
        bookingId: booking.id,
      });

      // Update payment record in database with PENDING status and Razorpay Order ID
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.finalAmount,
          paymentMethod: 'ONLINE',
          paymentStatus: 'PENDING',
          orderId: razorpayOrder.id,
        },
      });
    } else {
      // CASH checkout (mostly walk-in via receptionist)
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.finalAmount,
          paymentMethod: data.paymentMethod,
          paymentStatus: 'PENDING', // Payment to be accepted during check-in/check-out
        },
      });

      // Audit Log
      await prisma.activityLog.create({
        data: {
          userId: user?.id || null,
          action: 'BOOKING_CREATE',
          details: `Confirmed Cash Reservation ${booking.bookingNumber} for ${customer.name}`,
        },
      });

      // Fetch hotel details for mail
      const hotel = await prisma.hotel.findUnique({ where: { id: data.hotelId } });

      // Send email
      await sendBookingConfirmationEmail(customer.email, {
        customerName: customer.name,
        bookingNumber: booking.bookingNumber,
        hotelName: hotel?.name || 'Grand Luxury Hotel',
        roomType: category.name,
        roomNumbers: [selectedRoom.roomNumber],
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        amountPaid: booking.finalAmount,
        paymentStatus: 'Pay on Arrival (CASH)',
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Booking created successfully',
        booking,
        razorpayOrder,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create booking API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
