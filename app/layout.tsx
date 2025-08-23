// @/app/layout.tsx
// SaaS 的根布局文件
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { ThemeProvider } from '@/components/theme-provider';

// 元数据对象
export const metadata: Metadata = {
  title: 'mini-treehole',
  description: 'A simple trial for creating a mini-treehole'
};

// 视口配置对象
export const viewport: Viewport = {
  maximumScale: 1 // 无法缩放
};

const manrope = Manrope({ subsets: ['latin'] });

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en" className={manrope.className} suppressHydrationWarning
    >
      <body className="min-h-[100dvh]">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SWRConfig
            value={{
              fallback: {
                // 传递 promise 给 fallback 对象，读取数据时才开始 await
                '/api/user': getUser(),
                '/api/team': getTeamForUser()
              }
            }}
          >
            {children}
          </SWRConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}
