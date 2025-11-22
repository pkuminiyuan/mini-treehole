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
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        setLikeCount(initialLikeCount);
        setIsLiked(initialIsLikedByUser);
    }, [initialLikeCount, initialIsLikedByUser]);

    const handleLike = async () => {
        if (!user || isLoading) {
            console.warn('User not logged in or request in progress.');
            return;
        }

        setIsLoading(true);
        try {
            const { liked, likeCount: newCount } = await fetcher<{ liked: boolean; likeCount: number }>(
                `/api/posts/${postId}/likes`,
                { method: 'POST' }
            );
            setIsLiked(liked);
            setLikeCount(newCount);
        } catch (error) {
            console.error('Failed to toggle like:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const buttonClass = `
        flex items-center space-x-1
        ${isLiked ? 'text-blue-500' : 'text-gray-500'}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-colors duration-200 ease-in-out
    `;

    return (
        <button
            onClick={handleLike}
            className={buttonClass}
            disabled={isLoading || !user}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {variant === 'icon' && (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    // 点赞时填充颜色，未点赞时不填充（fill="none"）
                    fill={isLiked ? "#e0245e" : "none"}
                    // 未点赞时显示描边，点赞时描边与填充同色
                    stroke={isLiked ? "#e0245e" : "currentColor"}
                    strokeWidth={isLiked ? 0 : 1.5} // 点赞时隐藏描边，未点赞时显示描边
                    aria-hidden="true"
                >
                    <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
            <span>
                {isLiked ? (isHovered && !isLoading ? '取消点赞' : '已点赞') : '点赞'}
            </span>
            <span>{likeCount}</span>
        </button>
    );
};

export default LikeButton;