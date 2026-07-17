import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get('hotelId');
    const checkInStr = searchParams.get('checkInDate');
    const checkOutStr = searchParams.get('checkOutDate');
    const guestsCountStr = searchParams.get('guests');

    if (!hotelId || !checkInStr || !checkOutStr) {
      return NextResponse.json(
        { success: false, message: 'hotelId, checkInDate, and checkOutDate are required query params.' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkInStr);
    const checkOutDate = new Date(checkOutStr);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid dates format' }, { status: 400 });
    }

    if (checkInDate >= checkOutDate) {
      return NextResponse.json({ success: false, message: 'Check-in must be before check-out date' }, { status: 400 });
    }

    const guests = guestsCountStr ? parseInt(guestsCountStr, 10) : 1;

    // 1. Fetch all room categories for this hotel
    const categories = await prisma.roomCategory.findMany({
      where: {
        hotelId,
        maxGuests: { gte: guests },
      },
      include: {
        roomAmenities: { include: { amenity: true } },
      },
    });

    // 2. Find all rooms in this hotel
    const allRooms = await prisma.room.findMany({
      where: {
        hotelId,
        status: { notIn: ['Maintenance', 'Blocked'] }, // exclude out-of-order rooms
      },
    });

    // 3. Find rooms that are booked during the requested date range
    // Overlapping logic: booking.checkInDate < checkOutDate AND booking.checkOutDate > checkInDate
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
        bookingRooms: {
          some: {
            room: { hotelId },
          },
        },
        AND: [
          { checkInDate: { lt: checkOutDate } },
          { checkOutDate: { gt: checkInDate } },
        ],
      },
      include: {
        bookingRooms: true,
      },
    });

    // Extract booked room IDs
    const bookedRoomIds = new Set<string>();
    for (const booking of overlappingBookings) {
      for (const br of booking.bookingRooms) {
        bookedRoomIds.add(br.roomId);
      }
    }

    // 4. Calculate available rooms per category
    const availability = categories.map((category) => {
      // Filter rooms in this category that are not in bookedRoomIds
      const categoryRooms = allRooms.filter(
        (room) => room.categoryId === category.id && !bookedRoomIds.has(room.id)
      );

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        pricePerNight: category.pricePerNight,
        maxGuests: category.maxGuests,
        hasAC: category.hasAC,
        images: category.images.split(','),
        amenities: category.roomAmenities.map((ra) => ({
          id: ra.amenity.id,
          name: ra.amenity.name,
          icon: ra.amenity.icon,
        })),
        availableRoomsCount: categoryRooms.length,
        // Send a list of available room IDs for selection
        availableRoomIds: categoryRooms.map((r) => r.id),
      };
    });

    return NextResponse.json({
      success: true,
      checkInDate: checkInStr,
      checkOutDate: checkOutStr,
      availability: availability.filter((a) => a.availableRoomsCount > 0), // only return categories with rooms available
    });
  } catch (error: any) {
    console.error('Check room availability error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
