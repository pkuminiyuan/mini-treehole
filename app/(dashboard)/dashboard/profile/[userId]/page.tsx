// @/app/(dashboard)/dashboard/profile/[userId]/page.tsx
// 个人主页页面：Client Component，根据 userId 获取并展示用户信息
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import NotFound from '@/app/not-found';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import {
    User,
    Mail,
    Calendar,
    Users,
    Shield,
    Activity,
    CheckCircle,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/loading-spinner';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/fetcher';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

interface UserData {
    user: User;
    teamId: string | null;
}

/**
 * 个人主页 Client Component
 */
export default function ProfilePage() {
    // 使用 useParams hook 获取参数
    const params = useParams();
    const userId = params.userId as string;

    // 使用 useSWR 获取数据
    const { data, error, isLoading } = useSWR<UserData>(
        `/api/users/${userId}`, 
        fetcher
    );

    // 处理加载状态
    if (isLoading) {
        return (
            <section className="flex-1 p-4 lg:p-8">
                <LoadingSpinner />
            </section>
        );
    }

    // 处理错误状态
    if (error) {
        if (error.message.includes('404')) {
            return <NotFound />;
        }
        return (
            <section className="flex-1 p-4 lg:p-8">
                <div className="text-center py-8">
                    <div className="text-red-500 mb-4">加载失败: {error.message}</div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                        重试
                    </button>
                </div>
            </section>
        );
    }

    // 处理数据不存在的情况
    if (!data) {
        return <NotFound />;
    }

    const { user, teamId } = data;

    return (
        <section className="flex-1 p-4 lg:p-8">
            {/* 页面标题 */}
            <h1 className="text-lg lg:text-2xl font-medium text-foreground mb-6">个人主页</h1>

            {/* 基本信息卡片 */}
            <Card className="mb-8 pt-0">
                <CardHeader className="bg-brand-muted-second px-6 py-5 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-bright-second rounded-lg">
                            <User className="w-6 h-6 text-brand-second" />
                        </div>
                        <CardTitle className="text-2xl font-semibold text-foreground">基本信息</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium text-muted-foreground mb-2 block">用户名</Label>
                            <div className="flex items-center gap-3 p-3 bg-accent-card rounded-lg">
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-bright-first">
                                    <User className="w-5 h-5 text-brand-first" />
                                </div>
                                <p className="text-lg font-medium text-foreground">{user.name}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium text-muted-foreground mb-2 block">邮箱地址</Label>
                            <div className="flex items-center gap-3 p-3 bg-accent-card rounded-lg">
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-bright-first">
                                    <Mail className="w-5 h-5 text-brand-first" />
                                </div>
                                <p className="text-lg text-foreground">{user.email}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium text-muted-foreground mb-2 block">用户角色</Label>
                            <div className="flex items-center gap-3 p-3 bg-accent-card rounded-lg">
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-bright-first">
                                    <Shield className="w-5 h-5 text-brand-first" />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.role === 'admin'
                                    ? 'bg-red-100 text-red-800'
                                    : user.role === 'moderator'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-brand-muted-fourth text-brand-accent-fourth'
                                    }`}>
                                    {user.role}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium text-muted-foreground mb-2 block">注册时间</Label>
                            <div className="flex items-center gap-3 p-3 bg-accent-card rounded-lg">
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-bright-first">
                                    <Calendar className="w-5 h-5 text-brand-first" />
                                </div>
                                <p className="text-lg text-foreground">
                                    {new Date(user.createdAt).toLocaleDateString('zh-CN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 团队信息卡片 */}
            <Card className="mb-8 pt-0">
                <CardHeader className="bg-brand-muted-third px-6 py-5 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-bright-third rounded-lg">
                            <Users className="w-6 h-6 text-brand-third" />
                        </div>
                        <CardTitle className="text-2xl font-semibold text-foreground">团队信息</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {teamId ? (
                        <div className="flex items-center justify-between p-4 bg-accent-card rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-bright-first">
                                    <Users className="w-5 h-5 text-brand-first" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">已加入团队</p>
                                    <p className="text-sm text-muted-foreground">团队ID：{teamId}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-bright-first">
                                <Users className="w-5 h-5 text-brand-first" />
                            </div>
                            <p className="text-foreground text-lg mb-2">暂无团队信息</p>
                            <p className="text-sm text-muted-foreground">您尚未加入任何团队</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 状态卡片 */}
            <Card className="mb-8 pt-0">
                <CardHeader className="bg-brand-muted-first px-6 py-5 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-bright-first rounded-lg">
                            <Activity className="w-6 h-6 text-brand-first" />
                        </div>
                        <CardTitle className="text-2xl font-semibold text-foreground">账户状态</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-brand-muted-second rounded-lg">
                            <Activity className="w-8 h-8 text-brand-second mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">在线状态</p>
                            <p className="text-lg font-semibold text-brand-accent-second">活跃</p>
                        </div>
                        <div className="text-center p-4 bg-brand-muted-third rounded-lg">
                            <CheckCircle className="w-8 h-8 text-brand-third mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">邮箱验证</p>
                            <p className="text-lg font-semibold text-brand-accent-third">已验证</p>
                        </div>
                        <div className="text-center p-4 bg-brand-muted-fourth rounded-lg">
                            <Shield className="w-8 h-8 text-brand-fourth mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">安全等级</p>
                            <p className="text-lg font-semibold text-brand-accent-fourth">标准</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}