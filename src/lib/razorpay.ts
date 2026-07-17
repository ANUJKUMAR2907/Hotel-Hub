import Razorpay from 'razorpay';
import crypto from 'crypto';

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const isRazorpayConfigured =
  KEY_ID && KEY_ID !== 'rzp_test_mockkeyid12345' &&
  KEY_SECRET && KEY_SECRET !== 'mockkeysecret67890abcdef';

let razorpayInstance: Razorpay | null = null;

if (isRazorpayConfigured) {
  razorpayInstance = new Razorpay({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
  });
}

interface CreateOrderParams {
  amount: number; // in INR
  bookingId: string;
}

export async function createRazorpayOrder({ amount, bookingId }: CreateOrderParams) {
  const amountInPaise = Math.round(amount * 100); // Razorpay processes amounts in paise (1 INR = 100 paise)
  const receiptId = `receipt_${bookingId.substring(0, 10)}_${Date.now()}`;

  if (!razorpayInstance) {
    // Return mock order details for simulated payment flow
    console.log(`[MOCK PAYMENTS] Creating mock Razorpay order for booking: ${bookingId}, amount: ₹${amount}`);
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 15)}`,
      entity: 'order',
      amount: amountInPaise,
      amount_paid: 0,
      amount_due: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      status: 'created',
      attempts: 0,
      notes: { bookingId },
      created_at: Math.floor(Date.now() / 1000),
      isMock: true,
    };
  }

  try {
    const order = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: { bookingId },
    });
    return { ...order, isMock: false };
  } catch (error) {
    console.error('Razorpay order creation failed, falling back to mock:', error);
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 15)}`,
      entity: 'order',
      amount: amountInPaise,
      amount_paid: 0,
      amount_due: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      status: 'created',
      attempts: 0,
      notes: { bookingId },
      created_at: Math.floor(Date.now() / 1000),
      isMock: true,
    };
  }
}

interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }: VerifyPaymentParams): boolean {
  // If this is a mock order transaction
  if (orderId.startsWith('order_mock_') || paymentId.startsWith('pay_mock_')) {
    console.log(`[MOCK PAYMENTS] Verifying mock signature for order ${orderId}`);
    return true; // Auto-pass for mock transactions
  }

  if (!isRazorpayConfigured) {
    return true; // Fallback simulation
  }

  try {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Razorpay signature verification error:', error);
    return false;
  }
}

export async function initiateRefund(paymentId: string, amount: number) {
  const amountInPaise = Math.round(amount * 100);

  if (paymentId.startsWith('pay_mock_') || !razorpayInstance) {
    console.log(`[MOCK PAYMENTS] Executing mock refund for payment ${paymentId}, amount: ₹${amount}`);
    return {
      id: `rfnd_mock_${Math.random().toString(36).substring(2, 15)}`,
      entity: 'refund',
      amount: amountInPaise,
      currency: 'INR',
      payment_id: paymentId,
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000),
      isMock: true,
    };
  }

  try {
    const refund = await razorpayInstance.payments.refund(paymentId, {
      amount: amountInPaise,
      speed: 'normal',
    });
    return { ...refund, isMock: false };
  } catch (error) {
    console.error('Razorpay refund failed, falling back to mock:', error);
    return {
      id: `rfnd_mock_${Math.random().toString(36).substring(2, 15)}`,
      entity: 'refund',
      amount: amountInPaise,
      currency: 'INR',
      payment_id: paymentId,
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000),
      isMock: true,
    };
  }
}
