import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isCustomer, isSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const reviewSchema = z.object({
  hotelId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5),
});

// GET: Fetch reviews
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get('hotelId');
    const all = searchParams.get('all') === 'true'; // Admin review list check

    const user = await getUserFromRequest(req);
    const isAdmin = user && isSuperAdmin(user);

    const whereClause: any = {};
    if (hotelId) whereClause.hotelId = hotelId;
    if (!isAdmin || !all) {
      whereClause.isApproved = true; // Non-admin only sees approved reviews
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        customer: { select: { name: true } },
        hotel: { select: { name: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, reviews });
  } catch (error: any) {
    console.error('List reviews error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Submit a review (Customer only)
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !isCustomer(user)) {
      return NextResponse.json({ success: false, message: 'Only registered customers can write reviews.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { hotelId, rating, comment } = parsed.data;

    if (!user.customer) {
      return NextResponse.json({ success: false, message: 'Customer profile incomplete' }, { status: 400 });
    }

    // Optional Check: Has this customer actually booked a room in this hotel?
    const hasBooked = await prisma.booking.findFirst({
      where: {
        customerId: user.customer.id,
        status: 'CHECKED_OUT',
        bookingRooms: {
          some: {
            room: { hotelId },
          },
        },
      },
    });

    if (!hasBooked) {
      return NextResponse.json(
        { success: false, message: 'You can only review hotels where you have completed a stay.' },
        { status: 400 }
      );
    }

    const review = await prisma.review.create({
      data: {
        hotelId,
        customerId: user.customer.id,
        rating,
        comment,
        isApproved: false, // requires admin approval
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully. It will be visible after admin approval.',
      review,
    });
  } catch (error: any) {
    console.error('Submit review error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Approve/Disapprove review (Admin only)
export async function PUT(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const approve = searchParams.get('approve') === 'true';

    if (!id) {
      return NextResponse.json({ success: false, message: 'Review ID required' }, { status: 400 });
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { isApproved: approve },
    });

    // Update Hotel rating average
    const siblingReviews = await prisma.review.findMany({
      where: { hotelId: review.hotelId, isApproved: true },
    });

    const averageRating =
      siblingReviews.length > 0
        ? siblingReviews.reduce((sum, r) => sum + r.rating, 0) / siblingReviews.length
        : 0;

    await prisma.hotel.update({
      where: { id: review.hotelId },
      data: { rating: parseFloat(averageRating.toFixed(1)) },
    });

    return NextResponse.json({
      success: true,
      message: approve ? 'Review approved successfully' : 'Review set to unapproved',
      review: updated,
    });
  } catch (error: any) {
    console.error('Approve review error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
