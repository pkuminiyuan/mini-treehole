// @/app/api/user/route.ts
// 用于客户端获取当前登录用户安全信息
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

/**
 * 处理 GET 请求，获取当前登录用户的公开信息
 * @returns 返回当前用户对象 (不包含敏感信息密码哈希)
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '用户未认证' }, { status: 401 });
    }

    // 排除敏感信息（如 passwordHash）
    const { passwordHash, ...safeUser } = user;
    console.log('Successfully returned safe user data. User email:', safeUser.email);
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Failed to get user information. Returning 500. Error:', error);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}