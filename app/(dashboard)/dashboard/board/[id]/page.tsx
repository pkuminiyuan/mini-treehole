// @/app/(app)/board/[id]/page.tsx
// 单篇留言详情页与其回复
import React from 'react';
import { getPostById, getRepliesForPost, PostWithAuthorAndStats } from '@/lib/db/queries';
import PostCard from '@/components/posts/post-card';
import PostForm from '@/components/posts/post-form';
import NotFound from '@/app/not-found';
import AuthCheckClient from '@/components/auth-check-client';
import PaginationControls from '@/components/pagination-controls';

interface SinglePostPageProps {
    params: Promise<{ id: string; }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SinglePostPage({ params, searchParams }: SinglePostPageProps) {
    const resolvedParams = await params;
    const postId = resolvedParams.id;
    if (!postId) {
        NotFound(); // ID 无效，返回 404
        return new Response('Invalid post ID', { status: 404 });
    }

    // 分页参数
    const resolvedSearchParams = await searchParams;
    const offset = parseInt(resolvedSearchParams.offset as string || '0', 10);
    const limit = parseInt(resolvedSearchParams.limit as string || '10', 10);

    if (isNaN(offset) || isNaN(limit) || offset < 0 || limit <= 0) {
        // 处理非法分页参数
        return new Response('Invalid pagination parameters', { status: 400 });
    }

    const [post, replies] = await Promise.all([
        getPostById(postId),
        getRepliesForPost(postId, offset, limit),
    ]);

    if (!post) {
        NotFound(); // 留言不存在，返回 404
        return new Response('留言不存在', { status: 404 });
    }

    // 计算当前页码 (currentPage 从 1 开始)
    // 这里是针对 replies 的分页
    const currentPage = Math.floor(offset / limit) + 1;

    return (
        <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">留言详情</h1>

            {/* 显示父留言 */}
            <PostCard post={post} showReplyButton={false} showParentLink={false} /> {/* 不在详情页显示回复按钮 */}

            <div className="mt-10">
                <h2 className="text-2xl font-bold mb-5 text-gray-900">回复 ({post.repliesCount})</h2>
                <AuthCheckClient loggedInOnly fallback={
                    <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md mb-6">
                        <p>请登录以发表回复。</p>
                    </div>
                }>
                    <PostForm parentId={postId} onPostCreated={() => {
                        // 这里可以触发客户端重新加载回复列表，或者做乐观更新
                        // 对于服务器组件，通常需要路由器刷新
                        // router.refresh(); // 在实际应用中，你可能需要一个客户端组件来处理 onPostCreated
                    }} />
                </AuthCheckClient>

                <div className="mt-8">
                    {replies.length === 0 ? (
                        <p className="text-center text-gray-600 text-lg">暂无回复。</p>
                    ) : (
                        replies.map((reply) => (
                            <PostCard key={reply.id} post={reply} showReplyButton={false} showParentLink={true} />
                        ))
                    )}
                </div>

                {post.repliesCount > limit && ( // 只有当实际回复数多于当前页面显示数时才显示分页
                    <PaginationControls
                        currentPage={currentPage}
                        perPage={limit}
                        baseUrl={`/board/${postId}`}
                        totalItems={post.repliesCount}
                    />
                )}
            </div>
        </div>
    );
}