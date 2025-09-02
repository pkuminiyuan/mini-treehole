// @/app/api/posts/route.ts
// 获取所有顶层留言，或创建新留言
import { NextResponse } from 'next/server';
import {
    getTopLevelPosts,
    createPost,
    getUser,
} from '@/lib/db/queries';

/**
 * 处理 GET 请求，获取所有顶层留言
 * @param request Next.js Request 对象
 * @returns 返回顶层留言列表，包含作者信息、点赞数、收藏数等。
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        if (isNaN(offset) || isNaN(limit) || offset < 0 || limit <= 0) {
            return NextResponse.json({ error: '分页参数无效' }, { status: 400 });
        }

        const {posts: posts} = await getTopLevelPosts(offset, limit);

        return NextResponse.json(posts);
    } catch (error) {
        console.error('获取顶层留言失败:', error);
        return NextResponse.json({ error: '获取顶层留言失败' }, { status: 500 });
    }
}

/**
 * 处理 POST 请求，创建一篇新留言
 * 只有登录用户才能创建留言
 * @param request Next.js Request 对象
 * @returns 返回创建的留言信息
 */
export async function POST(request: Request) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: '用户未认证' }, { status: 401 });
        }

        const { content, isAnonymous, parentId } = await request.json();

        // 数据校验
        if (typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: '内容不为空' }, { status: 400 });
        }
        if (typeof isAnonymous !== 'boolean') {
            return NextResponse.json({ error: 'isAnonymous 变量有误' }, { status: 400 });
        }
        if (parentId && typeof parentId !== 'string') {
            return NextResponse.json({ error: 'parentId 变量有误' }, { status: 400 });
        }

        const newPostData = {
            authorId: user.id,
            content,
            isAnonymous,
            parentId: parentId || null, // 如果没有提供 parentId，则视为顶层留言
        };

        const newPost = await createPost(newPostData);

        return NextResponse.json(newPost, { status: 201 }); // 201 Created
    } catch (error) {
        console.error('创建留言失败:', error);
        return NextResponse.json({ error: '创建留言失败' }, { status: 500 });
    }
}