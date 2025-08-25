// @/app/api/posts/[id]/bookmarks/route.ts
// 收藏/取消收藏指定留言
import { NextResponse } from 'next/server';
import { toggleBookmark, getUser } from '@/lib/db/queries';

/**
 * 处理 POST 请求，用于切换用户对指定留言的收藏状态
 * @param request Next.js Request 对象
 * @param { params: { id: string } } context 包含动态路由参数 id (留言ID)
 * @returns 返回收藏操作后的状态
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: '用户未认证' }, { status: 401 });
        }

        const postId = params.id;
        if (!postId) {
            return NextResponse.json({ error: 'post ID 无效' }, { status: 400 });
        }

        const isBookmarked = await toggleBookmark(user.id, postId); // toggleBookmark 直接返回是否已收藏

        return NextResponse.json({ isBookmarked });
    } catch (error) {
        console.error(`留言 ${params.id} 收藏/取消收藏失败:`, error);
        return NextResponse.json({ error: '收藏/取消收藏失败' }, { status: 500 });
    }
}