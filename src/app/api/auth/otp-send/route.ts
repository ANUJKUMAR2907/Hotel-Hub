import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/mail';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid email' }, { status: 400 });
    }

    const { email } = parsed.data;

    // Find User
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Email address not registered' },
        { status: 404 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Generate 6 Digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update User
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpiresAt: expiresAt,
      },
    });

    // Send email
    const sent = await sendOTPEmail(email, otp, user.name);

    return NextResponse.json({
      success: true,
      message: sent ? 'OTP sent successfully to your email' : 'OTP generated, check server console.',
    });
  } catch (error: any) {
    console.error('OTP Send API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error sending OTP' },
      { status: 500 }
    );
  }
}
