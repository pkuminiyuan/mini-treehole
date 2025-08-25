// @/middleware.ts
// 负责管理会话中间件 和 RLS 会话上下文设置
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SessionPayload, signToken, verifyToken, getUserSessionDetails } from '@/lib/auth/session';
import { applyRlsSessionContext, CurrentUserContext } from '@/lib/auth/auth-context';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|_next/data|api/auth|sign-in|sign-up|.*\\..*).*)',
    '/api/:path*',
  ],
  runtime: 'nodejs',
};

const protectedRoutes = '/dashboard';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  const isProtectedRoute = pathname.startsWith(protectedRoutes);

  let sessionPayload: (SessionPayload & { exp: number, iat: number }) | null = null;
  let res = NextResponse.next();

  // --- 1. 会话验证与刷新 ---
  if (sessionCookie) {
    try {
      sessionPayload = await verifyToken(sessionCookie.value);

      const nowInSeconds = Date.now() / 1000;
      const twelveHoursInSeconds = 12 * 60 * 60;
      // 检查 session 是否即将过期 (例如，在 12 小时内) 以进行刷新
      if (sessionPayload.exp < nowInSeconds + twelveHoursInSeconds) {
        console.log('Middleware: Session nearing expiration, refreshing token...');
        const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const newSessionToken = await signToken({
          userId: sessionPayload.userId,
          userEmail: sessionPayload.userEmail,
          userRole: sessionPayload.userRole, // 会话刷新时也带上角色
        });

        res.cookies.set({
          name: 'session',
          value: newSessionToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          expires: expiresInOneDay,
        });
        console.log('Middleware: Session refreshed.');
      }

    } catch (error) {
      console.error('Middleware: Error verifying or refreshing session:', error);
      res.cookies.delete('session');
      sessionPayload = null;
    }
  }

  // --- 2. 路由保护 ---
  if (isProtectedRoute && !sessionPayload) {
    console.log('Middleware: Redirecting unauthenticated user from protected route.');
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // --- 3. RLS 会话上下文设置 (基于已验证的会话 payload) ---
  let userContext: CurrentUserContext = { id: null, email: null, role: null };

  if (sessionPayload) {
    userContext = getUserSessionDetails(sessionPayload)!;
  }
  
  // 调用 applyRlsSessionContext 设置数据库会话变量
  try {
    await applyRlsSessionContext(userContext);
    console.log(`Middleware: RLS context applied for user ${userContext.id || 'N/A'}`);
  } catch (error) {
    console.error('Middleware: Failed to apply RLS session context:', error);
  }

  return res;
}