// @/app/api/posts/[id]/route.ts
// 对单篇留言进行获取、更新和删除
import { NextResponse } from 'next/server';
import {
    getPostById,
    updatePost,
    deletePost,
    getUser,
    PostWithAuthorAndStats,
} from '@/lib/db/queries';


interface RouteParamsContext {
    params: Promise<{ id: string }>;
}

/**
 * 处理 GET 请求，获取指定 ID 的留言详情
 * @param request Next.js Request 对象
 * @param context 包含动态路由参数 id
 * @returns 返回指定留言的详细信息。
 */
export async function GET(
    request: Request,
    context: RouteParamsContext
) {
    const postId = (await context.params).id;
    if (!postId) {
        return NextResponse.json({ error: 'postID 无效' }, { status: 400 });
    }
    try {
        const post: PostWithAuthorAndStats | null = await getPostById(postId);

        if (!post) {
            return NextResponse.json({ error: '未找到留言' }, { status: 404 });
        }

        return NextResponse.json(post);
    } catch (error) {
        console.error(`获取留言 ${postId} 失败:`, error);
        return NextResponse.json({ error: '获取留言失败' }, { status: 500 });
    }
}

/**
 * 处理 PUT 请求，更新指定 ID 的留言
 * 只有登录且是留言作者的用户才能更新
 * @param request Next.js Request 对象
 * @param context 包含动态路由参数 id
 * @returns 返回更新后的留言信息。
 */
export async function PUT(
    request: Request,
    context: RouteParamsContext
) {
    const user = await getUser();
    if (!user) {
        return NextResponse.json({ error: '用户未认证' }, { status: 401 });
    }

    const postId = (await context.params).id;
    if (!postId) {
        return NextResponse.json({ error: 'postID 无效' }, { status: 400 });
    }

    try {
        const { content, isAnonymous } = await request.json();

        // 简单的数据校验
        if (typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: '内容不为空' }, { status: 400 });
        }
        if (typeof isAnonymous !== 'boolean') {
            return NextResponse.json({ error: 'isAnonymous 变量有误' }, { status: 400 });
        }

        // 调用 updatePost，这里会通过 authorId 进行权限验证
        const updatedPost = await updatePost(postId, user.id, content, isAnonymous);

        if (!updatedPost) {
            // 如果 updatePost 返回 null，可能是 ID 不存在或者用户无权限
            // 为了安全考虑，不对外暴露具体是哪个原因，统一返回 404 或 403
            // 这里倾向于 403 Forbidden，因为用户已登录但尝试修改非自己的帖子
            const existingPostCheck = await getPostById(postId); // 检查帖子是否存在
            if (existingPostCheck && existingPostCheck.author?.id !== user.id) {
                return NextResponse.json({ error: '禁止访问：您不是这篇帖子的作者' }, { status: 403 });
            } else {
                return NextResponse.json({ error: '未找到留言或更新失败' }, { status: 404 });
            }
        }

        return NextResponse.json(updatedPost);
    } catch (error) {
        console.error(`更新留言 ${postId} 失败:`, error);
        return NextResponse.json({ error: '未找到留言' }, { status: 500 });
    }
}

/**
 * 处理 DELETE 请求，删除指定 ID 的留言。
 * 只有登录且是留言作者的用户才能删除。
 * @param request Next.js Request 对象
 * @param context 包含动态路由参数 id
 * @returns 返回删除成功或失败消息。
 */
export async function DELETE(
    request: Request,
    context: RouteParamsContext
) {
    const user = await getUser();
    if (!user) {
        return NextResponse.json({ error: '用户未认证' }, { status: 401 });
    }

    const postId = (await context.params).id;
    if (!postId) {
        return NextResponse.json({ error: 'postID 无效' }, { status: 400 });
    }

    try {
        // 调用 deletePost，这里会通过 authorId 进行权限验证
        const success = await deletePost(postId, user.id);

        if (!success) {
            // 类似 PUT，如果删除不成功，可能是 ID 不存在或无权限
            const existingPostCheck = await getPostById(postId);
            if (existingPostCheck && existingPostCheck.author?.id !== user.id) {
                return NextResponse.json({ error: '禁止访问：您不是这篇帖子的作者' }, { status: 403 });
            } else {
                return NextResponse.json({ error: '未找到留言或更新失败' }, { status: 404 });
            }
        }

        return NextResponse.json({ message: '留言删除成功' });
    } catch (error) {
        console.error(`删除留言 ${postId} 失败:`, error);
        return NextResponse.json({ error: '留言删除失败' }, { status: 500 });
    }
}