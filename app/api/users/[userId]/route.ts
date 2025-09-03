// @/app/api/users/[userId]/route.ts
// 根据 userId 获取指定用户的公开信息（供个人主页使用）
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, teamMembers } from '@/lib/db/schema';

/**
 * GET 请求处理函数
 * 根据路由参数 userId 查询对应用户的公开数据
 * @param context.params.userId - 目标用户的 UUID
 * @returns 
 *  - 200 + 用户公开数据(JSON) 如果查询成功
 *  - 404 + 错误信息 如果用户不存在
 *  - 500 + 错误信息 如果查询失败
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ userId: string }> }
) {
    const userId = (await context.params).userId;

    try {
        // 查询用户公开信息，排除 passwordHash 和 deleted 用户
        const userResult = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (userResult.length === 0) {
            return NextResponse.json(
                { error: '用户不存在' },
                { status: 404 }
            );
        }

        const user = userResult[0];

        // 查询用户所属团队
        const teamResult = await db
            .select({
                teamId: teamMembers.teamId,
            })
            .from(teamMembers)
            .where(eq(teamMembers.userId, userId))
            .limit(1);

        // 返回用户基本信息和团队 id（如果有）
        return NextResponse.json({
            user,
            teamId: teamResult.length > 0 ? teamResult[0].teamId : null,
        }, { status: 200 });
    } catch (error) {
        console.error('获取用户信息失败', error);
        return NextResponse.json(
            { error: '服务器错误，获取用户信息失败' },
            { status: 500 }
        );
    }
}