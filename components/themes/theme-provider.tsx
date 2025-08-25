// components/themes/theme-provider.tsx
// 负责管理主题状态
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

// 定义 ThemeProvider 组件
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider {...props}>{children}</NextThemesProvider>
    );
}