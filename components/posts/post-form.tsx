// @/components/posts/post-form.tsx
// 用于创建新留言或回复
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { fetcher } from '@/lib/utils/fetcher';
import { useAuth } from '../auth-check-client';
import { NewPost, Post } from '@/lib/db/schema';

interface PostFormProps {
    parentId?: string | null; // 如果是回复，则传入父留言 ID
    onPostCreated?: (newPost: Post) => void; // 留言创建成功后的回调
    buttonText?: string;
    placeholder?: string;
}

const PostForm: React.FC<PostFormProps> = ({
    parentId = null,
    onPostCreated,
    buttonText = parentId ? '发布回复' : '发布留言',
    placeholder = parentId ? '输入你的回复...' : '输入你的留言...',
}) => {
    const { user, isInitialLoading: isAuthLoading } = useAuth();
    const [content, setContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || isAuthLoading || isSubmitting) {
            setError('请先登录才能发布');
            return;
        }
        if (content.trim().length === 0) {
            setError('内容不能为空');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const postData: NewPost = {
            authorId: user.id,
            content,
            isAnonymous,
            parentId,
        };

        try {
            const newPost = await fetcher<Post>('/api/posts', {
                method: 'POST',
                body: postData,
            });
            setContent(''); // 清空表单
            setIsAnonymous(false);
            onPostCreated?.(newPost); // 调用回调函数
            router.refresh(); // 发布后立即刷新
        } catch (err: any) {
            console.error('Failed to create post:', err);
            setError(err.message || '发布失败，请重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isAuthLoading) {
        return <p className="text-center text-gray-500">加载用户身份...</p>;
    }

    if (!user) {
        return (
            <div className="p-4 bg-gray-100 rounded-md text-center text-gray-600">
                请 <Link href="/login" className="text-blue-600 hover:underline">登录</Link> 后发布留言或回复。
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-card p-4 rounded-lg shadow-md mb-6 border">
            <h3 className="text-lg font-semibold mb-3">
                {parentId ? '发表回复' : '发表新留言'}
            </h3>
            <textarea
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
                placeholder={placeholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                disabled={isSubmitting}
            ></textarea>
            <div className="flex items-center justify-between mt-3">
                <label className="flex items-center text-foreground">
                    <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border rounded"
                        disabled={isSubmitting}
                    />
                    匿名发布
                </label>
                <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || content.trim().length === 0}
                >
                    {isSubmitting ? '发布中...' : buttonText}
                </button>
            </div>
            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </form>
    );
};

export default PostForm;