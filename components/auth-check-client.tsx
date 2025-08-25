// @/components/auth-check-client.tsx
// 在客户端检查登录状态
'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import LoadingSpinner from './loading-spinner';
import { User } from '@/lib/db/schema';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 客户端会话提供者
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/user');
            if (response.ok) {
                const userData: User = await response.json();
                setUser(userData);
            } else {
                setUser(null); // 用户未登录或会话过期
            }
        } catch (error) {
            console.error('获取用户 session 失败:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const refetchUser = () => fetchUser();

    return (
        <AuthContext.Provider value={{ user, isLoading, refetchUser }}>
            {isLoading ? <LoadingSpinner /> : children}
        </AuthContext.Provider>
    );
};

// Hook 用于在客户端组件中访问认证信息
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth 必须在 AuthProvider 环境内使用');
    }
    return context;
};

interface AuthCheckProps {
    children: React.ReactNode;
    fallback?: React.ReactNode; // 未登录时显示的 fallback 内容
    loggedInOnly?: boolean; // 如果为 true，则只在登录时显示 children
    loggedOutOnly?: boolean; // 如果为 true，则只在未登录时显示 children
}

/**
 * AuthCheckClient 组件：根据用户登录状态条件性渲染其子组件
 * 必须在 AuthProvider 内部使用
 */
const AuthCheckClient: React.FC<AuthCheckProps> = ({
    children,
    fallback = null,
    loggedInOnly = false,
    loggedOutOnly = false,
}) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingSpinner />;
    }

    // 根据 loggedInOnly 决定渲染
    if (loggedInOnly) {
        return user ? <>{children}</> : <>{fallback}</>;
    }

    // 根据 loggedOutOnly 决定渲染
    if (loggedOutOnly) {
        return user ? <>{fallback}</> : <>{children}</>;
    }

    // 默认行为：如果登录则渲染 children，否则渲染 fallback
    return user ? <>{children}</> : <>{fallback}</>;
};

export default AuthCheckClient;