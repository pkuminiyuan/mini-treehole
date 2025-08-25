// @/app/(app)/profile/[userId]/bookmarks/page.tsx
import React from 'react';
import { getBookmarkedPosts, PostsQueryResult } from '@/lib/db/queries';
import PostCard from '@/components/posts/post-card';
import PaginationControls from '@/components/pagination-controls';
import NotFound from '@/app/not-found';

interface UserBookmarksPageProps {
    params: Promise<{ userId: string; }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UserBookmarksPage({ params, searchParams }: UserBookmarksPageProps) {
    const resolvedParams = await params;
    const userId = resolvedParams.userId;
    if (!userId) {
        NotFound(); // ID 无效，返回 404
        return new Response('Invalid post ID', { status: 404 });
    }

    const resolvedSearchParams = await searchParams;
    const offset = parseInt(resolvedSearchParams.offset as string || '0', 10);
    const limit = parseInt(resolvedSearchParams.limit as string || '10', 10);

    let bookmarkedPostsData: PostsQueryResult = { posts: [], totalCount: 0 }; // 初始化
    try {
        bookmarkedPostsData = await getBookmarkedPosts(userId, offset, limit);
    } catch (error) {
        console.error(`Failed to fetch bookmarked posts for user ${userId}:`, error);
        // 这里可以进一步处理错误，例如显示友好的错误消息
        NotFound(); // 如果数据获取失败
    }

    const { posts: bookmarkedPosts, totalCount } = bookmarkedPostsData;

    const currentPage = Math.floor(offset / limit) + 1;

    return (
        <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">用户 {userId} 的收藏</h1>

            {bookmarkedPosts.length === 0 ? (
                <p className="text-center text-gray-600 text-lg">暂无收藏留言。</p>
            ) : (
                bookmarkedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))
            )}

            {/* 假设 getTotalBookmarkedPostsCount(userId) 函数能够获取总数 */}
            {/* 或者根据返回的 bookmarkedPosts 数量判断是否显示下一页 */}
            <PaginationControls
                currentPage={currentPage}
                perPage={limit}
                baseUrl={`/profile/${userId}/bookmarks`}
                totalItems={totalCount}
            />
        </div>
    );
}