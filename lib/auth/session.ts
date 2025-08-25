// @/lib/auth/session.ts
// 负责用户身份认证和会话管理
import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { UserRole } from '@/lib/db/schema';

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is not set.');
}
const key = new TextEncoder().encode(AUTH_SECRET);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
) {
  return compare(plainTextPassword, hashedPassword);
}

// MODIFIED: 扩展 SessionPayload 类型，包含 userId, userEmail, userRole
export type SessionPayload = {
  userId: string;
  userEmail: string;
  userRole: UserRole;
  // JOSE 会自动添加 'exp', 'iat', 'nbf' 等标准 JWT 声明
};

// signToken 接收扩展后的 SessionPayload，并返回 JWT 字符串
export async function signToken(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now') // 这里设置过期时间
    .sign(key);
}

// verifyToken 返回扩展后的 SessionPayload
// 注意：jwtVerify 返回的 payload 会包含所有标准声明和我们自定义的声明
export async function verifyToken(input: string): Promise<SessionPayload & {exp: number, iat: number}> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  // 类型断言
  return payload as unknown as (SessionPayload & {exp: number, iat: number});
}

// getSession 返回扩展后的 SessionPayload | null
export async function getSession(): Promise<(SessionPayload & {exp: number, iat: number}) | null> {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) return null;
  try {
    return await verifyToken(sessionCookie);
  } catch (error) {
    console.error('Failed to verify session token:', error);
    (await cookies()).set('session', '', { expires: new Date(0) });
    return null;
  }
}

// 定义用于 setSession 的用户数据接口
export interface AuthUserForSession {
  id: string;
  email: string;
  role: UserRole;
}

// 接收 AuthUserForSession，并将其写入 JWT
export async function setSession(user: AuthUserForSession) {
  const encryptedSession = await signToken({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
  });
  (await cookies()).set('session', encryptedSession, {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 设置 cookie 的过期时间
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

// 为中间件和 auth-context 提供统一的用户会话详情
export interface UserSessionDetails {
  id: string;
  email: string | null;
  role: UserRole;
}

export function getUserSessionDetails(payload?: SessionPayload & {exp: number, iat: number}): UserSessionDetails | null {
  if (!payload || !payload.userId) {
    return null;
  }
  return {
    id: payload.userId,
    email: payload.userEmail,
    role: payload.userRole,
  };
}
