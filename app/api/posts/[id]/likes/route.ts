// @/app/api/posts/[id]/likes/route.ts
// 点赞/取消点赞指定留言
import { NextResponse } from 'next/server';
import { toggleLike, getUser } from '@/lib/db/queries';

/**
 * 处理 POST 请求，用于切换用户对指定留言的点赞状态
 * @param request Next.js Request 对象
 * @param { params: { id: string } } context 包含动态路由参数 id (留言ID)
 * @returns 返回点赞操作后的状态和点赞总数
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

    const { liked, likeCount } = await toggleLike(user.id, postId);

    return NextResponse.json({ liked, likeCount });
  } catch (error) {
    console.error(`留言 ${params.id} 点赞/取消点赞失败:`, error);
    return NextResponse.json({ error: '点赞/取消点赞失败' }, { status: 500 });
  }
}