import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear cookie by setting expiration to past
  response.headers.set(
    'Set-Cookie',
    `token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; ${
      process.env.NODE_ENV === 'production' ? 'Secure;' : ''
    }`
  );

  return response;
}
