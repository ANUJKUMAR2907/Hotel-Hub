import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid inputs' }, { status: 400 });
    }

    const { email, otp } = parsed.data;

    // Find User
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 400 });
    }

    // Check OTP
    if (!user.otpCode || !user.otpExpiresAt || user.otpCode !== otp) {
      return NextResponse.json({ success: false, message: 'Invalid OTP code' }, { status: 400 });
    }

    // Check Expiration
    if (new Date() > new Date(user.otpExpiresAt)) {
      return NextResponse.json({ success: false, message: 'OTP has expired' }, { status: 400 });
    }

    // Clear OTP details
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    // Sign JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
    });

    // Set cookie response
    const response = NextResponse.json({
      success: true,
      message: 'OTP login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
    });

    response.headers.set(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax; ${
        process.env.NODE_ENV === 'production' ? 'Secure;' : ''
      }`
    );

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN_OTP',
        details: `Log in successful via OTP for: ${email}`,
      },
    });

    return response;
  } catch (error: any) {
    console.error('OTP Login API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error verifying OTP' },
      { status: 500 }
    );
  }
}
