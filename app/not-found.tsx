// @/app/not-found.tsx
// 访问不存在的路由
import Link from 'next/link';
import { CircleIcon } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh]">
      <div className="max-w-md space-y-8 p-4 text-center">
        <div className="flex justify-center">
          <CircleIcon className="size-12 text-brand-first" />
        </div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          页面好像走丢啦~
        </h1>
        <p className="text-base text-muted-foreground">
          可能是开发者还没写完代码，也有可能是遇到 bug ，请海涵 qwq
        </p>
        <Link
          href="/"
          className="max-w-48 mx-auto flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          回到首页
        </Link>
      </div>
    </div>
  );
}
