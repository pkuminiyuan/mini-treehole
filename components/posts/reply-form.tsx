// @/components/posts/reply-form.tsx
// 回复表单，复用 PostForm 实现，新建独立组件方便后续扩展和管理
'use client';

import React from 'react';
import PostForm from './post-form';
import { useRouter } from 'next/navigation';

interface ReplyFormProps {
    parentId: string;
}

const ReplyForm: React.FC<ReplyFormProps> = ({ parentId }) => {
    const router = useRouter();

    return (
        <div>
            <PostForm
                parentId={parentId}
                // 回复提交成功后刷新当前页面，让回复列表更新
                onPostCreated={() => {
                    router.refresh();
                }}
                buttonText="发布回复"
                placeholder="输入你的回复..."
            />
        </div>
    );
};

export default ReplyForm;