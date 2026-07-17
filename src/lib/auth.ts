import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_purposes';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Password Hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token Operations
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Extract User from Next.js Request (Supporting both Bearer header and Cookies)
export async function getUserFromRequest(req: Request) {
  let token: string | null = null;

  // 1. Try to read from Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Try to read from Cookie header
  if (!token) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((cookie) => {
          const [key, ...value] = cookie.trim().split('=');
          return [key, value.join('=')];
        })
      );
      token = cookies['token'] || null;
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: true,
        customer: true,
        employee: {
          include: {
            hotel: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') return null;
    return user;
  } catch (error) {
    return null;
  }
}

// Role Authorization Check Helpers
export function isSuperAdmin(user: any): boolean {
  return user?.role?.name === 'SUPER_ADMIN';
}

export function isReceptionist(user: any): boolean {
  return user?.role?.name === 'RECEPTIONIST' || user?.role?.name === 'SUPER_ADMIN';
}

export function isCustomer(user: any): boolean {
  return user?.role?.name === 'CUSTOMER';
}
