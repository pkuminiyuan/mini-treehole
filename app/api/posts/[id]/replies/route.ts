// @/app/api/posts/[id]/replies/route.ts
// 获取指定留言的回复列表
import { NextResponse } from 'next/server';
import { getRepliesForPost, PostWithAuthorAndStats } from '@/lib/db/queries';

interface RouteParamsContext {
    params: Promise<{ id: string }>;
}

/**
 * 处理 GET 请求，获取指定父留言的回复列表
 * @param request Next.js Request 对象
 * @param context 包含动态路由参数 id (父留言ID)
 * @returns 返回回复列表
 */
export async function GET(
    request: Request,
    context: RouteParamsContext
) {
    const parentId = (await context.params).id;
    if (!parentId) {
        return NextResponse.json({ error: 'parentID 无效' }, { status: 400 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        if (isNaN(offset) || isNaN(limit) || offset < 0 || limit <= 0) {
            return NextResponse.json({ error: '分页参数无效' }, { status: 400 });
        }

        const replies: PostWithAuthorAndStats[] = await getRepliesForPost(parentId, offset, limit);

        return NextResponse.json(replies);
    } catch (error) {
        console.error(`获取 ${parentId} 的回复失败:`, error);
        return NextResponse.json({ error: '获取回复失败' }, { status: 500 });
    }
}