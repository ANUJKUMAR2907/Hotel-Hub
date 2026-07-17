import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isReceptionist, isSuperAdmin } from '@/lib/auth';
import { initiateRefund } from '@/lib/razorpay';
import { z } from 'zod';

const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED']).optional(),
  specialRequests: z.string().optional(),
  extendStayDate: z.string().optional(), // New check-out date
});

// GET: Fetch single booking details
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        payments: true,
        invoices: true,
        serviceRequests: true,
        bookingRooms: {
          include: {
            room: {
              include: {
                category: true,
                hotel: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    // Customer scoping security
    if (user.role.name === 'CUSTOMER' && booking.customer.userId !== user.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error('Fetch booking details error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update booking status, Extend stay, Cancel booking
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { status, paymentStatus, specialRequests, extendStayDate } = parsed.data;

    // Fetch existing booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        bookingRooms: { include: { room: true } },
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    // Authorization checks
    if (user.role.name === 'CUSTOMER') {
      if (booking.customer.userId !== user.id) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
      }
      // Customer can ONLY cancel booking and ONLY if pending or confirmed
      if (status && status !== 'CANCELLED') {
        return NextResponse.json({ success: false, message: 'Invalid operation' }, { status: 400 });
      }
      if (booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED') {
        return NextResponse.json(
          { success: false, message: 'Cannot cancel reservation after check-in/checkout/cancellation.' },
          { status: 400 }
        );
      }
    }

    // 1. Handle Cancellation
    if (status === 'CANCELLED' && booking.status !== 'CANCELLED') {
      // Run transaction to restore room status and process refund metadata
      await prisma.$transaction(async (tx) => {
        // Update booking status
        await tx.booking.update({
          where: { id },
          data: { status: 'CANCELLED', paymentStatus: booking.paymentStatus === 'PAID' ? 'REFUNDED' : 'PENDING' },
        });

        // Set room status back to Available
        for (const br of booking.bookingRooms) {
          await tx.room.update({
            where: { id: br.roomId },
            data: { status: 'Available' },
          });
        }

        // Trigger Mock Refund if payment was completed
        if (booking.paymentStatus === 'PAID') {
          const successPayment = booking.payments.find((p) => p.paymentStatus === 'SUCCESS');
          if (successPayment?.transactionId) {
            await initiateRefund(successPayment.transactionId, booking.finalAmount);
            await tx.payment.create({
              data: {
                bookingId: id,
                amount: booking.finalAmount,
                paymentMethod: successPayment.paymentMethod,
                paymentStatus: 'REFUNDED',
                transactionId: successPayment.transactionId,
                refundId: `rfnd_${Math.random().toString(36).substring(2, 10)}`,
              },
            });
          }
        }

        // Audit Log
        await tx.activityLog.create({
          data: {
            userId: user.id,
            action: 'BOOKING_CANCEL',
            details: `Cancelled booking: ${booking.bookingNumber}, released room ${booking.bookingRooms.map((r) => r.room.roomNumber).join(',')}`,
          },
        });
      });

      return NextResponse.json({ success: true, message: 'Booking cancelled successfully.' });
    }

    // 2. Handle Extend Stay
    if (extendStayDate) {
      if (!isReceptionist(user)) {
        return NextResponse.json({ success: false, message: 'Only staff can extend stay' }, { status: 403 });
      }

      const newCheckOut = new Date(extendStayDate);
      if (newCheckOut <= new Date(booking.checkOutDate)) {
        return NextResponse.json({ success: false, message: 'New check-out date must be after current check-out date' }, { status: 400 });
      }

      // Check if room is available during extension
      const assignedRoom = booking.bookingRooms[0].room;
      const overlappingRooms = await prisma.booking.findMany({
        where: {
          id: { not: booking.id },
          status: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
          bookingRooms: {
            some: { roomId: assignedRoom.id },
          },
          AND: [
            { checkInDate: { lt: newCheckOut } },
            { checkOutDate: { gt: new Date(booking.checkOutDate) } }, // from old checkout date onwards
          ],
        },
      });

      if (overlappingRooms.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Room is already booked by another customer for the extension period.' },
          { status: 400 }
        );
      }

      // Calculate extra cost
      const diffTime = Math.abs(newCheckOut.getTime() - new Date(booking.checkOutDate).getTime());
      const extraNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const roomPrice = booking.bookingRooms[0].pricePerNight;
      const extraRoomCharges = roomPrice * extraNights;

      // Calculate extra tax (maintain current active taxes or same logic)
      const activeTaxes = await prisma.tax.findMany({ where: { isActive: true } });
      const taxRateSum = activeTaxes.reduce((sum, tax) => sum + tax.rate, 0);
      const extraTaxAmount = (extraRoomCharges * taxRateSum) / 100;
      const extraFinalAmount = extraRoomCharges + extraTaxAmount;

      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id },
          data: {
            checkOutDate: newCheckOut,
            totalAmount: { increment: extraRoomCharges },
            taxAmount: { increment: extraTaxAmount },
            finalAmount: { increment: extraFinalAmount },
            // If already checked in, extension doesn't change check-in status
          },
        });

        // Audit Log
        await tx.activityLog.create({
          data: {
            userId: user.id,
            action: 'BOOKING_EXTEND',
            details: `Extended booking ${booking.bookingNumber} by ${extraNights} nights to ${extendStayDate}`,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Stay extended successfully by ${extraNights} nights. Additional amount: ₹${extraFinalAmount.toFixed(2)}`,
      });
    }

    // 3. Regular field updates (Status, PaymentStatus, SpecialRequests)
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (specialRequests !== undefined) updateData.specialRequests = specialRequests;

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error: any) {
    console.error('Update booking error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete booking (Admin only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const booking = await prisma.booking.findUnique({ where: { id }, include: { bookingRooms: true } });
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Restore rooms availability
      for (const br of booking.bookingRooms) {
        await tx.room.update({
          where: { id: br.roomId },
          data: { status: 'Available' },
        });
      }
      // Delete booking (cascades payments, invoices, bookingRooms)
      await tx.booking.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error: any) {
    console.error('Delete booking error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
