import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthenticated or session expired' },
        { status: 401 }
      );
    }

    // Strip sensitive fields
    const { passwordHash, otpCode, otpExpiresAt, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        role: user.role.name,
      },
    });
  } catch (error: any) {
    console.error('Auth check me error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error checking session' },
      { status: 500 }
    );
  }
}
