// @/app/api/users/[userId]/bookmarks/route.ts
// 获取指定用户收藏的留言列表
import { NextResponse } from 'next/server';
import { getBookmarkedPosts } from '@/lib/db/queries';


interface RouteParamsContext {
    params: Promise<{ userId: string }>;
}

/**
 * 处理 GET 请求，获取指定用户收藏的留言列表
 * @param request Next.js Request 对象
 * @param context 包含动态路由参数 userId
 * @returns 返回收藏的留言列表
 */
export async function GET(
    request: Request,
    context: RouteParamsContext
) {
    const targetUserId = (await context.params).userId;
    if (!targetUserId) {
        return NextResponse.json({ error: '用户 ID 无效' }, { status: 400 });
    }

    try {
        // 可选：如果希望只有用户自己能看自己的收藏，或者管理员能看，可以在这里加权限检查
        // const currentUserId = await getCurrentUserId();
        // if (!currentUserId || (currentUserId !== targetUserId && !isAdmin(currentUserId))) {
        //   return NextResponse.json({ error: 'Forbidden: You cannot view other users\' bookmarks' }, { status: 403 });
        // }

        const { searchParams } = new URL(request.url);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        if (isNaN(offset) || isNaN(limit) || offset < 0 || limit <= 0) {
            return NextResponse.json({ error: '分页参数无效' }, { status: 400 });
        }

        const bookmarkedPosts = await getBookmarkedPosts(targetUserId, offset, limit);

        return NextResponse.json(bookmarkedPosts);
    } catch (error) {
        console.error(`获取用户 ${targetUserId} 收藏留言失败:`, error);
        return NextResponse.json({ error: '获取用户收藏留言失败' }, { status: 500 });
    }
}