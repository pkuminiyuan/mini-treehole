// @/app/(app)/board/page.tsx
// 留言板主页，显示顶层留言
import React from 'react';
import { getTopLevelPosts, PostsQueryResult } from '@/lib/db/queries';
import PostCard from '@/components/posts/post-card';
import PostForm from '@/components/posts/post-form';
import PaginationControls from '@/components/pagination-controls';
import AuthCheckClient from '@/components/auth-check-client';
import NotFound from '@/app/not-found';
import { Card, CardContent } from '@/components/ui/card';

interface BoardPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Next.js Server Component 自动处理数据获取
export default async function BoardPage({ searchParams }: BoardPageProps) {
    const params = await searchParams;
    const offset = parseInt(params.offset as string || '0', 10);
    const limit = parseInt(params.limit as string || '10', 10);

    if (isNaN(offset) || isNaN(limit) || offset < 0 || limit <= 0) {
        // 可以在这里重定向或者显示错误信息
        // 为了简单，我们只用默认值或者返回一个错误
        return new Response('Invalid pagination parameters', { status: 400 });
    }

    let postsData: PostsQueryResult = { posts: [], totalCount: 0 }; // 初始化
    try {
        postsData = await getTopLevelPosts(offset, limit);
    } catch (error) {
        console.error('Failed to fetch posts:', error);
        NotFound(); // 数据获取失败，返回 404
    }

    const { posts, totalCount } = postsData;

    // 计算当前页码 (currentPage 从 1 开始)
    const currentPage = Math.floor(offset / limit) + 1;

    return (
        <section className="flex-1 p-4 lg:p-8">
            <h1 className="text-lg lg:text-2xl font-medium text-foreground mb-6">留言板</h1>

            <AuthCheckClient loggedInOnly fallback={
                <Card>
                    <CardContent>
                        请登录以发表新留言
                    </CardContent>
                </Card>
            }>
                <PostForm />
            </AuthCheckClient>

            <div className="mt-8">
                {posts.length === 0 ? (
                    <p className="text-center text-foreground text-lg">暂无留言。</p>
                ) : (
                    posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))
                )}
            </div>

            <PaginationControls
                currentPage={currentPage}
                perPage={limit}
                baseUrl="/board"
                totalItems={totalCount}
            />
        </section>
    );
}