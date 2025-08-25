// @/app/(dashboard)/layout.tsx
// dashboard 共享布局，包含头部导航和用户菜单
'use client';

import Link from 'next/link';
import { useState, Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CircleIcon, Home, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { ThemeToggle } from '@/components/themes/theme-toggle';
import { AuthProvider, useAuth } from '@/components/auth-check-client';

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 从 useAuth 中只解构我们需要且稳定的状态
  const { user, isInitialLoading } = useAuth();

  useEffect(() => {
    // 调试用途：观察 UserMenu 组件的 user 状态变化
    console.log('UserMenu: useEffect 观察到 user 状态变化:', user, 'isInitialLoading:', isInitialLoading);
  }, [user, isInitialLoading]);

  async function handleSignOut() {
    console.log('UserMenu: handleSignOut 被触发');
    // 调用服务器 Action，它将处理 session 删除、路径重新验证和重定向。
    // 客户端的 JavaScript 执行流会在服务器响应重定向时中断。
    await signOut();
    console.log('UserMenu: signOut 已被调用，页面即将重定向...');
  }

  // 只有在应用程序初次加载且用户状态未知 (undefined) 时显示加载动画
  if (isInitialLoading && typeof user === 'undefined') {
    console.log('UserMenu: 渲染中 - 初始加载 / 用户状态未知...');
    return <div className="h-9 w-20 bg-gray-200 animate-pulse rounded-full"></div>;
  }
  
  // 如果用户状态已知为未登录 (user 为 null)
  if (!user) {
    console.log('UserMenu: 渲染中 - 用户未登录 (user is null)');
    return (
      <>
        <Button asChild className="rounded-full">
          <Link href="/sign-up" className='text-brand-primary-foreground'>登录</Link>
        </Button>
      </>
    );
  }

  // 如果用户状态已知为已登录 (user 为 User 对象)
  console.log('UserMenu: 渲染中 - 用户已登录:', user.email);
  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback>
            {user.email
              ?.split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>控制面板</span>
          </Link>
        </DropdownMenuItem>
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>退出</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  return (
    <header className="border-b border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <CircleIcon className="h-6 w-6 text-brand-primary" />
          <span className="ml-2 text-xl font-semibold text-foreground">MINI-TREEHOLE</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Suspense fallback={<div className="h-9" />}>
            <UserMenu />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <section className="flex flex-col min-h-screen">
        <Header />
        {children}
      </section>
    </AuthProvider>
  );
}