import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.mailtrap.io';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '2525', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@grandluxuryhotel.com';

// Initialize nodemailer transport (falls back to console mock if credentials are not configured)
const transporter =
  SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      })
    : null;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!transporter) {
    console.log('\n--- [MOCK MAIL SENDER] ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: \n${html.replace(/<[^>]*>/g, ' ').trim()}`);
    console.log('---------------------------\n');
    return true;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email via SMTP:', error);
    return false;
  }
}

export async function sendOTPEmail(email: string, otp: string, name: string): Promise<boolean> {
  const subject = `Your One-Time Password (OTP) for Hotel Hub`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #b89047; text-align: center;">Hotel Hub</h2>
      <p>Hello ${name},</p>
      <p>We received a request to log in to your account. Use the following One-Time Password (OTP) to complete your login. This OTP is valid for 10 minutes.</p>
      <div style="background-color: #fcf8f2; border: 1px dashed #b89047; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #b89047;">${otp}</span>
      </div>
      <p>If you did not initiate this request, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777; text-align: center;">&copy; 2026 Hotel Hub. All rights reserved.</p>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
}

export async function sendBookingConfirmationEmail(
  email: string,
  bookingDetails: {
    customerName: string;
    bookingNumber: string;
    hotelName: string;
    roomType: string;
    roomNumbers: string[];
    checkInDate: string;
    checkOutDate: string;
    amountPaid: number;
    paymentStatus: string;
  }
): Promise<boolean> {
  const subject = `Booking Confirmed - ${bookingDetails.bookingNumber} | ${bookingDetails.hotelName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #b89047; margin: 0;">Hotel Hub</h2>
        <p style="color: #777; font-size: 14px; margin: 5px 0 0 0;">Reservation Confirmation</p>
      </div>
      
      <p>Dear ${bookingDetails.customerName},</p>
      <p>Your booking has been successfully confirmed. We are looking forward to welcoming you.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #fcf8f2;">
          <th colspan="2" style="padding: 10px; border: 1px solid #b89047; text-align: left; color: #b89047;">Booking Details</th>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Booking Number</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${bookingDetails.bookingNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Hotel</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${bookingDetails.hotelName}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Room Category</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${bookingDetails.roomType}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Rooms Assigned</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${bookingDetails.roomNumbers.join(', ') || 'Assigned on arrival'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Check-In Date</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${bookingDetails.checkInDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Check-Out Date</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${bookingDetails.checkOutDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Amount Paid</td>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #2e7d32;">₹${bookingDetails.amountPaid.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Payment Status</td>
          <td style="padding: 10px; border: 1px solid #ddd;"><span style="background-color: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${bookingDetails.paymentStatus}</span></td>
        </tr>
      </table>
      
      <p style="font-size: 14px;"><strong>Important Information:</strong></p>
      <ul style="font-size: 13px; color: #555; padding-left: 20px;">
        <li>Standard check-in time is 2:00 PM and check-out time is 12:00 PM.</li>
        <li>Please carry a valid government-issued photo identity card (Aadhaar, Passport, or Driving License) for check-in.</li>
        <li>For any changes or cancellations, please visit your profile dashboard or contact us directly.</li>
      </ul>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777; text-align: center;">&copy; 2026 Hotel Hub. All rights reserved.</p>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
}
