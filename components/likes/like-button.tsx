// @/components/likes/like-button.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { fetcher } from '@/lib/utils/fetcher';
import { useAuth } from '../auth-check-client';

interface LikeButtonProps {
    postId: string;
    initialLikeCount: number;
    initialIsLikedByUser: boolean;
    variant?: 'button' | 'icon'; // 可选，按钮样式
}

const LikeButton: React.FC<LikeButtonProps> = ({
    postId,
    initialLikeCount,
    initialIsLikedByUser,
    variant = 'button',
}) => {
    const { user } = useAuth();
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [isLiked, setIsLiked] = useState(initialIsLikedByUser);
    const [isLoading, setIsLoading] = useState(false);
    // 新增状态：跟踪鼠标是否悬停在按钮上
    const [isHovered, setIsHovered] = useState(false);

    // 当 props 变化时 (例如帖子列表重新加载)，同步状态
    useEffect(() => {
        setLikeCount(initialLikeCount);
        setIsLiked(initialIsLikedByUser);
    }, [initialLikeCount, initialIsLikedByUser]);

    const handleLike = async () => {
        // 如果用户未登录或请求正在进行中，阻止操作
        if (!user || isLoading) {
            console.warn('User not logged in or request in progress.');
            // 可以在此处添加用户友好的提示，如弹窗 "请先登录"
            return;
        }

        setIsLoading(true);
        try {
            const { liked, likeCount: newCount } = await fetcher<{ liked: boolean; likeCount: number }>(
                `/api/posts/${postId}/likes`,
                {
                    method: 'POST',
                }
            );
            setIsLiked(liked);
            setLikeCount(newCount);
        } catch (error) {
            console.error('Failed to toggle like:', error);
            // 可以在此处添加用户友好的错误消息显示
        } finally {
            setIsLoading(false);
        }
    };

    // 动态生成按钮的 CSS 类名
    const buttonClass = `
        flex items-center space-x-1
        ${isLiked ? 'text-blue-500' : 'text-gray-500'}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} // 添加 cursor-pointer 非禁用状态下鼠标变手型
        transition-colors duration-200 ease-in-out // 添加过渡效果，使颜色变化更平滑
    `;

    return (
        <button
            onClick={handleLike}
            className={buttonClass}
            disabled={isLoading || !user}
            // 鼠标进入和离开事件，更新 isHovered 状态
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {variant === 'icon' ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 fill-current"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    {isLiked ? (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.529 0-1.04-.21-1.414-.586L4 16m0 0V5a2 2 0 012-2h2.5M4 16l4.017 4.017M4 16l-4.017 4.017M4 16H4"
                            fill="currentColor"
                        />
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.529 0-1.04-.21-1.414-.586L4 16V9.284c0-.83.46-1.554 1.157-1.784L12 3m0 0L9.407 9.284M12 3h1.341L12 3"
                        />
                    )}
                </svg>
            ) : (
                // 文本模式，根据 isLiked 和 isHovered 动态显示文本
                <span>
                    {isLiked
                        ? (isHovered && !isLoading ? '取消点赞' : '已点赞') // 已点赞状态且鼠标悬停时显示 '取消点赞'
                        : '点赞'}
                </span>
            )}
            <span>{likeCount}</span> {/* 显示点赞数量 */}
        </button>
    );
};

export default LikeButton;