// @/components/auth-check-client.tsx
// 在客户端检查登录状态
'use client';

import React, { useEffect, useState, createContext, useContext, useRef, useCallback } from 'react';
import LoadingSpinner from './loading-spinner';
import { User } from '@/lib/db/schema';
import { usePathname } from 'next/navigation';

// 定义认证上下文类型接口
interface AuthContextType {
    user: User | null | undefined;         // undefined 表示初始加载中，null 表示未登录，User 对象表示已登录
    isInitialLoading: boolean;             // 是否正在初次加载用户数据 (阻塞UI)
    refetchUser: () => void;               // 重新获取用户数据的函数
    clearUser: () => void;                 // 清除用户数据的函数（用于退出登录）
    error: any;                            // 错误信息
}

// 创建 Context 对象，初始值为 undefined（需要在 Provider 中提供实际值）
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider 组件：提供认证上下文给整个应用或部分组件树
 * 包装在应用外层，为所有子组件提供用户认证状态
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null | undefined>(undefined); // 用户数据状态
    const [isInitialLoading, setIsInitialLoading] = useState(true);       // 标记是否在进行初次加载
    const [error, setError] = useState<any>(null);                        // 错误状态
    const pathname = usePathname();                                       // 获取当前路由路径
    const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);           // 用于 Debounce 定时器
    const isMounted = useRef(false);                                      // 用于判断组件是否已挂载 (避免重复初始获取)

    /**
     * 获取用户数据的异步函数
     * 使用 useCallback 确保函数引用稳定，避免不必要的 Effect 重新运行
     */
    const fetchUser = useCallback(async () => {
        // 在初次加载阶段 (user为undefined且isInitialLoading为true) 保持isInitialLoading为true
        // 否则，不设置UI阻塞的加载状态，避免导航卡顿
        setError(null); // 清除之前的错误

        try {
            console.log('AuthProvider: Fetching user session from /api/user...');
            const response = await fetch('/api/user');
            
            if (response.ok) {
                const userData: User = await response.json();
                console.log('AuthProvider: 成功获取用户数据:', userData?.email);
                // 仅当用户数据实际发生变化时才更新状态
                // 简单的浅比较，如果需要更严格，可实现深比较
                if (user?.id !== userData.id || user?.email !== userData.email) {
                    setUser(userData);
                }
            } else if (response.status === 401) {
                console.log('AuthProvider: /api/user 返回 401，用户未认证');
                if (user !== null) { // 仅当当前状态不是 null 时才更新
                    setUser(null);
                }
            } else {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error('AuthProvider: /api/user 错误响应:', errorData);
                setError(new Error(errorData.message || 'Failed to fetch user'));
                if (user !== null) { // 出错时假设未认证，清除用户状态
                    setUser(null);
                }
            }
        } catch (err) {
            console.error('AuthProvider: 获取用户 session 失败捕捉到错误:', err);
            setError(err);
            if (user !== null) { // 发生网络错误时清除用户状态
                setUser(null);
            }
        } finally {
            // 无论成功失败，初次加载阶段结束
            setIsInitialLoading(false);
            console.log('AuthProvider: fetchUser 函数执行完成。');
        }
    }, [user, isInitialLoading]); // 依赖 user 和 isInitialLoading 是因为 fetchUser 内部逻辑会用到它们

    // useEffect 用于处理组件挂载和 pathname 变化时的会话检查
    useEffect(() => {
        // 如果是组件首次挂载 (通过 useRef 判断)，立即触发一次会话检查
        if (!isMounted.current) {
            isMounted.current = true;
            console.log('AuthProvider: Initial mount, triggering immediate fetch.');
            fetchUser();
        } else {
            console.log(`AuthProvider: Pathname changed to ${pathname}.`);
            // 清除任何待处理的 Debounce 定时器
            if (fetchTimerRef.current) {
                clearTimeout(fetchTimerRef.current);
            }

            // 对于已知的用户状态 (user不是undefined，即已经完成初始化加载)
            // 采用 Debounce 机制进行后台会话刷新，避免频繁请求
            if (typeof user !== 'undefined') { // 用户状态已知 (null 或 User 对象)
                console.log(`AuthProvider: User state known, debouncing user fetch for ${pathname}.`);
                fetchTimerRef.current = setTimeout(() => {
                    fetchUser();
                }, 300); // 300ms 的防抖延迟
            } else { // 用户状态为 undefined (例如，刚从 sign-out 重定向回来，需要快速确定状态)
                 console.log(`AuthProvider: User state undefined, triggering immediate fetch for ${pathname}.`);
                 fetchUser(); // 立即触发，不延迟
            }
        }
        
        // Cleanup 函数，在组件卸载或 effect 重新运行时清除定时器
        return () => {
             if (fetchTimerRef.current) {
                clearTimeout(fetchTimerRef.current);
            }
        };
    }, [pathname, user, fetchUser]); // 依赖 pathname, user, fetchUser

    /**
     * 重新获取用户数据的函数
     * 可用于手动刷新用户状态（如登录后）
     * Force immediate fetch, bypasses debounce
     */
    const refetchUser = useCallback(() => {
        console.log('AuthProvider: refetchUser called, triggering immediate fetch.');
        if (fetchTimerRef.current) { // 清除任何 pending 的 debounced fetches
            clearTimeout(fetchTimerRef.current);
        }
        setIsInitialLoading(true); // 视为初始化加载，显示加载动画直到数据返回
        fetchUser();
    }, [fetchUser]);

    /**
     * 清除用户数据的函数
     * 用于退出登录场景，立即清除本地状态
     */
    const clearUser = useCallback(() => {
        setUser(null); // 立即清除本地用户状态
        setIsInitialLoading(false); // 确保加载状态也重置
        setError(null);
        console.log('AuthProvider: clearUser called, user set to null.');
    }, []);

    // 提供认证上下文给子组件
    return (
        <AuthContext.Provider value={{ user, isInitialLoading, refetchUser, clearUser, error }}>
            {/* 只在 isInitialLoading 且用户状态为 undefined 时显示全局加载动画 */}
            {isInitialLoading && typeof user === 'undefined' ? <LoadingSpinner /> : children}
        </AuthContext.Provider>
    );
};

/**
 * useAuth Hook：在客户端组件中访问认证信息
 * 必须在 AuthProvider 环境内使用
 * @returns 认证上下文对象
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth 必须在 AuthProvider 环境内使用');
    }
    return context;
};

// AuthCheck 组件的属性接口
interface AuthCheckProps {
    children: React.ReactNode;      // 需要条件渲染的子组件
    fallback?: React.ReactNode;     // 未满足条件时显示的备用内容
    loggedInOnly?: boolean;         // 是否仅限登录用户可见
    loggedOutOnly?: boolean;        // 是否仅限未登录用户可见
}

/**
 * AuthCheckClient 组件：根据用户登录状态条件性渲染其子组件
 * 提供灵活的权限控制渲染逻辑
 * 必须在 AuthProvider 内部使用
 */
const AuthCheckClient: React.FC<AuthCheckProps> = ({
    children,
    fallback = null,
    loggedInOnly = false,
    loggedOutOnly = false,
}) => {
    const { user, isInitialLoading } = useAuth(); // 使用 isInitialLoading

    // 仅在初次加载时显示加载动画，此时用户状态未知
    if (isInitialLoading && typeof user === 'undefined') {
        return <LoadingSpinner />;
    }

    // 仅限登录用户访问的逻辑
    if (loggedInOnly) {
        return user ? <>{children}</> : <>{fallback}</>;
    }

    // 仅限未登录用户访问的逻辑
    if (loggedOutOnly) {
        return user ? <>{fallback}</> : <>{children}</>;
    }

    // 默认行为：如果不是特定限制，登录用户显示内容，未登录显示备用内容 (如果你想在这里做一些默认区分)
    // 根据你的项目，可能只需要上面的 loggedInOnly/loggedOutOnly 即可
    return <>{children}</>; // 默认在所有已加载状态下都显示子组件
};

export default AuthCheckClient;