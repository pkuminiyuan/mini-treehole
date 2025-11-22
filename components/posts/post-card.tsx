// @/components/posts/post-card.tsx
// 单个留言卡
'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
    showReplyButton?: boolean;
    showParentLink?: boolean;

    // 折叠配置
    enableCollapse?: boolean;
    collapsedLines?: number;
}

const PostCard: React.FC<PostCardProps> = ({
    post,
    onPostDeleted,
    onPostUpdated,
    showReplyButton = true,
    showParentLink = false,
    enableCollapse = true,
    collapsedLines = 5,
}) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const [editedIsAnonymous, setEditedIsAnonymous] = useState(post.isAnonymous);
    const [isUpdating, setIsUpdating] = useState(false);
    const router = useRouter();

    // 折叠相关
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const contentRef = useRef<HTMLParagraphElement | null>(null);
    const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
    const [lineHeightPx, setLineHeightPx] = useState<number>(20);

    useLayoutEffect(() => {
        if (!enableCollapse || isEditing) {
            setIsOverflowing(false);
            setMeasuredHeight(null);
            return;
        }

        const el = contentRef.current;
        if (!el) {
            setIsOverflowing(false);
            return;
        }

        const cs = getComputedStyle(el);
        const lh = parseFloat(cs.lineHeight);
        const resolvedLineHeight = Number.isFinite(lh) && lh > 0 ? lh : 20;
        const scrollH = el.scrollHeight;

        setLineHeightPx(resolvedLineHeight);
        setMeasuredHeight(scrollH);

        const maxAllowed = resolvedLineHeight * collapsedLines;
        setIsOverflowing(scrollH > maxAllowed + 1);

        if (scrollH <= maxAllowed + 1) {
            setIsExpanded(false);
        }
    }, [post.content, enableCollapse, collapsedLines, isEditing]);

    useEffect(() => {
        if (isEditing) {
            setIsExpanded(true);
        } else if (!enableCollapse) {
            setIsExpanded(true);
        } else {
            // 保持当前折叠/展开状态，由测量决定是否显示展开按钮
        }
    }, [isEditing, enableCollapse]);

    const handleDelete = async () => {
        if (!user || !user.id || !confirm('确定要删除这条留言吗？')) return;
        try {
            await fetcher(`/api/posts/${post.id}`, { method: 'DELETE' });
            onPostDeleted?.(post.id);
            router.refresh();
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
            onPostUpdated?.(updatedPost);
            setIsEditing(false);
            router.refresh();
        } catch (error) {
            console.error('更新留言失败:', error);
            alert('更新留言失败');
        } finally {
            setIsUpdating(false);
        }
    };

    const computedMaxHeight = (() => {
        if (!enableCollapse) return 'none';
        if (isExpanded) return measuredHeight ? `${measuredHeight}px` : 'none';
        const h = lineHeightPx * collapsedLines;
        return `${h}px`;
    })();

    const isOwner = Boolean(
        post.isOwnedByCurrentUser
        || (user?.id && user.id === post.author?.id)
    );

    return (
        <div className="border bg-card rounded-lg p-4 mb-4 shadow-sm w-full">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-foreground mb-1">
                        由
                        {' '}
                        {post.isAnonymous ? (
                            // 匿名帖子
                            isOwner ? (
                                <span className="font-semibold">你发的！（放心，别人不知道哦~）</span> // 作者本人看到的伪匿名
                            ) : (
                                <span className="font-semibold">匿名用户</span> // 其他人看到的匿名
                            )
                        ) : (
                            // 非匿名：显示用户名字（如无作者信息则“不留芳名”）
                            post.author ? (
                                <Link
                                    href={`/dashboard/profile/${post.author.id}`}
                                    className="font-semibold text-blue-500 hover:underline"
                                >
                                    {post.author.name}
                                </Link>
                            ) : (
                                <span className="font-semibold">不留芳名</span>
                            )
                        )}
                        {' '}
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
                <div className="mt-2">
                    <div
                        className="relative"
                        style={{
                            maxHeight: computedMaxHeight,
                            overflow: enableCollapse ? 'hidden' : 'visible',
                            transition: enableCollapse ? 'max-height 220ms ease' : undefined,
                        }}
                        aria-expanded={isExpanded}
                    >
                        <p
                            ref={contentRef}
                            className="text-foreground whitespace-pre-wrap"
                            style={{ margin: 0 }}
                        >
                            {post.content}
                        </p>

                        {/* 渐变遮罩 */}
                        {enableCollapse && !isExpanded && isOverflowing && (
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute left-0 right-0 bottom-0 h-10"
                            >
                                <div className="h-full w-full bg-gradient-to-b from-transparent to-[var(--card)]" />
                            </div>
                        )}
                    </div>

                    {enableCollapse && isOverflowing && (
                        <div className="mt-2 flex items-center">
                            <button
                                type="button"
                                className="text-sm text-blue-500 hover:underline"
                                onClick={() => setIsExpanded((s) => !s)}
                                aria-expanded={isExpanded}
                                aria-controls={`post-content-${post.id}`}
                            >
                                {isExpanded ? '收起' : '展开全文'}
                            </button>
                            <span className="text-xs text-gray-500 ml-2">
                                {isExpanded ? '已展开' : `显示前 ${collapsedLines} 行`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between space-x-4 mt-4 text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                    <LikeButton
                        postId={post.id}
                        initialLikeCount={post.likeCount}
                        initialIsLikedByUser={post.isLikedByUser}
                        variant='icon'
                    />
                    <BookmarkButton
                        postId={post.id}
                        initialIsBookmarkedByUser={post.isBookmarkedByUser}
                        variant='icon'
                    />
                    {showReplyButton && (
                        <Link href={`/dashboard/board/${post.id}`} className="text-blue-500 hover:underline flex items-center space-x-1">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="#1792f6ff"
                                strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{post.repliesCount} 回复</span>
                        </Link>
                    )}
                </div>

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