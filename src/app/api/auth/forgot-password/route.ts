import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/mail';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
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

    if (user && user.status === 'ACTIVE') {
      // Generate a temporary password
      const tempPassword = 'Temp_' + Math.random().toString(36).substring(2, 10).toUpperCase() + '!';
      const hashedPassword = await hashPassword(tempPassword);

      // Update in DB
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
        },
      });

      // Send Email
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #b89047; text-align: center;">Hotel Hub</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password. We have generated a temporary password for you:</p>
          <div style="background-color: #fcf8f2; border: 1px dashed #b89047; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
            <span style="font-size: 20px; font-weight: bold; color: #b89047;">${tempPassword}</span>
          </div>
          <p>Please log in using this temporary password and change your password immediately in your profile settings.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777; text-align: center;">&copy; 2026 Hotel Hub. All rights reserved.</p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: 'Temporary Password - Hotel Hub',
        html,
      });

      // Audit Log
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_REQUEST',
          details: `Temporary password sent to ${email}`,
        },
      });
    }

    // Always return a success response to prevent email harvesting
    return NextResponse.json({
      success: true,
      message: 'If the email matches a registered account, a temporary password has been sent.',
    });
  } catch (error: any) {
    console.error('Forgot Password API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error processing password reset' },
      { status: 500 }
    );
  }
}
