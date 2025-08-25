// @/app/(app)/board/loading.tsx
import LoadingSpinner from '@/components/loading-spinner';
import React from 'react';

export default function Loading() {
    return (
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-foreground">正在加载留言...</p>
        </div>
    );
}