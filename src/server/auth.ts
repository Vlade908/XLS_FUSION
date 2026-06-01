import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'xls_fusion_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '5m';

export interface AuthPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createAuthToken(payload: AuthPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string) {
  try {
    const parsed = jwt.verify(token, JWT_SECRET);
    if (typeof parsed === 'object' && parsed && 'userId' in parsed && 'email' in parsed) {
      return parsed as AuthPayload;
    }
  } catch {
    return null;
  }
  return null;
}

export function getTokenFromHeader(header?: string) {
  if (!header) return null;
  const parts = header.split(' ');
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}

export function getAuthUserFromToken(token: string) {
  return verifyAuthToken(token);
}
