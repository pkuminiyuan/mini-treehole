// @/components/posts/post-card.tsx
// 单个留言卡
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PostWithAuthorAndStats } from '@/lib/db/queries';
import LikeButton from '../likes/like-button';
import BookmarkButton from '../bookmarks/bookmark-button';
import AuthCheckClient, { useAuth } from '../auth-check-client';
import { fetcher } from '@/lib/utils/fetcher';
import { useRouter } from 'next/navigation';

interface PostCardProps {
    post: PostWithAuthorAndStats;
    onPostDeleted?: (postId: string) => void;
    onPostUpdated?: (updatedPost: PostWithAuthorAndStats) => void;
    showReplyButton?: boolean; // 控制是否显示回复按钮
    showParentLink?: boolean; // 控制是否显示指向父留言的链接
}

const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted, onPostUpdated, showReplyButton = true, showParentLink = false }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const [editedIsAnonymous, setEditedIsAnonymous] = useState(post.isAnonymous);
    const [isUpdating, setIsUpdating] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!user || !user.id || !confirm('确定要删除这条留言吗？')) return;

        try {
            await fetcher(`/api/posts/${post.id}`, { method: 'DELETE' });
            onPostDeleted?.(post.id);
            router.refresh(); // 删除后立即刷新
        } catch (error) {
            console.error('删除留言失败:', error);
            alert('删除留言失败');
        }
    };

    const handleUpdate = async () => {
        if (!user || !user.id || isUpdating) return;
        if (editedContent.trim().length === 0) {
            alert('内容不能为空');
            return;
        }
        setIsUpdating(true);
        try {
            const updatedPost = await fetcher<PostWithAuthorAndStats>(`/api/posts/${post.id}`, {
                method: 'PUT',
                body: { content: editedContent, isAnonymous: editedIsAnonymous },
            });
            onPostUpdated?.(updatedPost); // 通知父组件更新列表或特定帖子
            setIsEditing(false); // 退出编辑模式
            router.refresh(); // 更新后立即刷新
        } catch (error) {
            console.error('更新留言失败:', error);
            alert('更新留言失败');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="border bg-card rounded-lg p-4 mb-4 shadow-sm w-full">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-foreground mb-1">
                        由{' '}
                        {post.isAnonymous ? (
                            <span className="font-semibold">匿名用户</span>
                        ) : (
                            <Link href={`/dashboard/profile/${post.author?.id}`} className="font-semibold text-blue-500 hover:underline">
                                {post.author?.name || '不留芳名'}
                            </Link>
                        )}{' '}
                        发表于 {new Date(post.createdAt).toLocaleString()}
                        {post.createdAt !== post.updatedAt && (
                            <span className="text-xs text-gray-500 ml-2">(已编辑)</span>
                        )}
                    </p>
                    {showParentLink && post.parentId && (
                        <div className="text-xs text-gray-500 mb-2">
                            回复了 <Link href={`/dashboard/board/${post.parentId}`} className="text-blue-500 hover:underline">原始留言</Link>
                        </div>
                    )}
                </div>
            </div>

            {isEditing ? (
                <div className="mt-2">
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full p-2 border rounded-md resize-y min-h-[80px]"
                        readOnly={isUpdating}
                    />
                    <div className="flex items-center justify-between mt-3">
                        <label className="flex items-center text-foreground">
                            <input
                                type="checkbox"
                                checked={editedIsAnonymous}
                                onChange={(e) => setEditedIsAnonymous(e.target.checked)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border rounded"
                                disabled={isUpdating}
                            />
                            匿名发布
                        </label>
                        <button
                            onClick={handleUpdate}
                            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                            disabled={isUpdating}
                        >
                            {isUpdating ? '更新中...' : '保存修改'}
                        </button>
                    </div>
                </div>
            ) : (
                <p className="mt-2 text-foreground whitespace-pre-wrap">{post.content}</p>
            )}

            <div className="flex items-center justify-between space-x-4 mt-4 text-sm text-gray-600">
                {/* 左侧：点赞、收藏、回复 */}
                <div className="flex items-center space-x-4">
                    <LikeButton
                        postId={post.id}
                        initialLikeCount={post.likeCount}
                        initialIsLikedByUser={post.isLikedByUser}
                    />
                    <BookmarkButton
                        postId={post.id}
                        initialIsBookmarkedByUser={post.isBookmarkedByUser}
                    />
                    {showReplyButton && (
                        <Link href={`/dashboard/board/${post.id}`} className="text-blue-500 hover:underline flex items-center space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <span>{post.repliesCount} 回复</span>
                        </Link>
                    )}
                </div>

                {/* 右侧：编辑和删除按钮 */}
                <AuthCheckClient loggedInOnly>
                    {user && (user.id === post.author?.id || user.role === 'admin') && (
                        <div className="flex space-x-2 items-baseline">
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-blue-500 hover:text-blue-700 hover:cursor-pointer text-sm"
                            >
                                {isEditing ? '取消编辑' : '编辑'}
                            </button>
                            {isEditing || (
                                <button
                                    onClick={handleDelete}
                                    className="text-red-500 hover:text-red-700 hover:cursor-pointer text-sm"
                                >
                                    删除
                                </button>
                            )}
                        </div>
                    )}
                </AuthCheckClient>
            </div>
        </div>
    );
};
export default PostCard;