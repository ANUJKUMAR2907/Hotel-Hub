import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // 1. Core KPIs
    // Total Revenue (only paid bookings)
    const paidBookings = await prisma.booking.findMany({
      where: {
        paymentStatus: 'PAID',
        status: { not: 'CANCELLED' },
      },
      select: { finalAmount: true },
    });
    const totalRevenue = paidBookings.reduce((sum, b) => sum + b.finalAmount, 0);

    // Total Bookings count
    const totalBookingsCount = await prisma.booking.count();

    // Total Rooms count & Occupancy Rate
    const totalRooms = await prisma.room.count();
    const occupiedRooms = await prisma.room.count({
      where: { status: 'Occupied' },
    });
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Total Customers count
    const totalCustomers = await prisma.customer.count();

    // 2. Revenue Breakdown - Monthly (Past 6 Months)
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthBookings = await prisma.booking.findMany({
        where: {
          paymentStatus: 'PAID',
          status: { not: 'CANCELLED' },
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: { finalAmount: true },
      });

      const revenue = monthBookings.reduce((sum, b) => sum + b.finalAmount, 0);
      monthlyRevenue.push({
        month: monthsName[d.getMonth()] + ' ' + d.getFullYear().toString().substring(2),
        revenue,
        bookings: monthBookings.length,
      });
    }

    // 3. Booking Status Distribution
    const statusCounts = await prisma.booking.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const bookingStatusData = statusCounts.map((s) => ({
      status: s.status,
      count: s._count._all,
    }));

    // 4. Popular Room Categories
    const categories = await prisma.roomCategory.findMany({
      include: {
        _count: {
          select: { rooms: true },
        },
        rooms: {
          include: {
            _count: {
              select: { bookingRooms: true },
            },
          },
        },
      },
    });

    const popularCategories = categories.map((c) => {
      // Sum up bookingRooms count for all rooms in this category
      const bookingCount = c.rooms.reduce((sum, r) => sum + r._count.bookingRooms, 0);
      return {
        categoryName: c.name,
        price: c.pricePerNight,
        roomsCount: c._count.rooms,
        bookingsCount: bookingCount,
      };
    }).sort((a, b) => b.bookingsCount - a.bookingsCount).slice(0, 5);

    // 5. Customer Growth Trend (Past 6 Months)
    const customerGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const count = await prisma.customer.count({
        where: {
          createdAt: {
            lte: endOfMonth,
          },
        },
      });

      customerGrowth.push({
        month: monthsName[d.getMonth()] + ' ' + d.getFullYear().toString().substring(2),
        customers: count,
      });
    }

    // 6. Recent Activity Logs (Admin Audit Trail)
    const recentLogs = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const auditTrail = recentLogs.map((log) => ({
      id: log.id,
      userName: log.user?.name || 'System / Guest',
      email: log.user?.email || 'N/A',
      action: log.action,
      details: log.details,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue: Math.round(totalRevenue),
        totalBookings: totalBookingsCount,
        occupancyRate: parseFloat(occupancyRate.toFixed(1)),
        totalCustomers,
      },
      monthlyRevenue,
      bookingStatusData,
      popularCategories,
      customerGrowth,
      auditTrail,
    });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
