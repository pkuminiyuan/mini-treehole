// @/components/bookmarks/bookmark-button.tsx
// 收藏按钮
'use client';

import React, { useState, useEffect } from 'react';
import { fetcher } from '@/lib/utils/fetcher';
import { useAuth } from '../auth-check-client';

interface BookmarkButtonProps {
    postId: string;
    initialIsBookmarkedByUser: boolean;
    variant?: 'button' | 'icon'; // 可选，按钮样式
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({
    postId,
    initialIsBookmarkedByUser,
    variant = 'icon',
}) => {
    const { user } = useAuth();
    const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarkedByUser);
    const [isLoading, setIsLoading] = useState(false);

    // 当 props 变化时，同步状态
    useEffect(() => {
        setIsBookmarked(initialIsBookmarkedByUser);
    }, [initialIsBookmarkedByUser]);

    const handleBookmark = async () => {
        if (!user || isLoading) {
            console.warn('User not logged in or request in progress.');
            return;
        }

        setIsLoading(true);
        try {
            const { isBookmarked: newIsBookmarked } = await fetcher<{ isBookmarked: boolean }>(
                `/api/posts/${postId}/bookmarks`,
                {
                    method: 'POST',
                }
            );
            setIsBookmarked(newIsBookmarked);
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const buttonClass = `
        flex items-center space-x-1 
        ${isBookmarked ? 'text-yellow-500' : 'text-gray-500'} 
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `;

    return (
        <button onClick={handleBookmark} className={buttonClass} disabled={isLoading || !user}>
            {variant === 'icon' ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 fill-current"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    {isBookmarked ? (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            fill="currentColor"
                        />
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                    )}
                </svg>
            ) : (
                <span>{isBookmarked ? '已收藏' : '收藏'}</span>
            )}
        </button>
    );
};

export default BookmarkButton;