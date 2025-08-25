// @/app/api/posts/[id]/bookmarks/route.ts
// 收藏/取消收藏指定留言
import { NextResponse } from 'next/server';
import { toggleBookmark, getUser } from '@/lib/db/queries';


interface RouteParamsContext {
    params: Promise<{ id: string }>;
}

/**
 * 处理 POST 请求，用于切换用户对指定留言的收藏状态
 * @param request Next.js Request 对象
 * @param context 包含动态路由参数 id (留言ID) 的上下文对象
 * @returns 返回收藏操作后的状态
 */
export async function POST(
    request: Request,
    context: RouteParamsContext
) {
    const user = await getUser();
    if (!user) {
        return NextResponse.json({ error: '用户未认证' }, { status: 401 });
    }

    const postId = (await context.params).id; // <--- 从 context.params 中获取 id
    if (!postId) {
        return NextResponse.json({ error: 'post ID 无效' }, { status: 400 });
    }
    try {
        const isBookmarked = await toggleBookmark(user.id, postId);

        return NextResponse.json({ isBookmarked });
    } catch (error) {
        console.error(`留言 ${postId} 收藏/取消收藏失败:`, error); // 同样修改为 context.params.id
        return NextResponse.json({ error: '收藏/取消收藏失败' }, { status: 500 });
    }
}