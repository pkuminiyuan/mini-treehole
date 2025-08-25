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
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 假设我们不知道 totalItems，只提供 Prev/Next
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
    // 如果有 totalItems，可以计算 hasNext
    // const hasNext = (currentPage * perPage) < totalItems;

    return (
        <div className="flex justify-between items-center mt-6">
            <button
                onClick={() => handlePageChange('prev')}
                disabled={!hasPrev}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                上一页
            </button>
            <span className="text-gray-700">第 {currentPage} 页</span>
            <button
                onClick={() => handlePageChange('next')}
                // 简单起见，假设总是有下一页，直到 API 返回空数组
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                下一页
            </button>
        </div>
    );
};

export default PaginationControls;