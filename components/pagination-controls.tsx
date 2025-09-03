// @/components/pagination-controls.tsx
// 管理分页机制
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationControlsProps {
    totalItems: number; // 可选：如果知道总数可以考虑
    currentPage: number;
    perPage: number;
    baseUrl: string; // 例如 '/board', '/profile/123/bookmarks'
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
    currentPage,
    perPage,
    baseUrl,
    totalItems,
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handlePageChange = (direction: 'prev' | 'next') => {
        let newOffset;
        if (direction === 'prev') {
            newOffset = Math.max(0, (currentPage - 2) * perPage); // currentPage 是从 1 开始的
        } else {
            newOffset = currentPage * perPage;
        }

        const current = new URLSearchParams(Array.from(searchParams.entries()));
        current.set('offset', String(newOffset));
        current.set('limit', String(perPage));

        router.push(`${baseUrl}?${current.toString()}`);
    };

    const hasPrev = currentPage > 1;
    const hasNext = (currentPage * perPage) < totalItems;

    return (
        <div className="flex justify-between items-center mt-6">
            <button
                onClick={() => handlePageChange('prev')}
                disabled={!hasPrev}
                className="px-4 py-2 bg-brand-first text-brand-first-foreground rounded-md hover:bg-brand-accent-first hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {hasPrev ? '上一页' : '已是最前页'}
            </button>
            <span className="text-muted-foreground">第 {currentPage} 页</span>
            <button
                onClick={() => handlePageChange('next')}
                disabled={!hasNext}
                className="px-4 py-2 bg-brand-first text-brand-first-foreground rounded-md hover:bg-brand-accent-first hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {hasNext ? '下一页' : '已是最后页'}
            </button>
        </div>
    );
};

export default PaginationControls;