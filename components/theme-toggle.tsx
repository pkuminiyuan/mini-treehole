// components/theme-toggle.tsx
// 主题切换按钮
'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
    const { setTheme, theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true); // 组件挂载到客户端后，设置 mounted 为 true
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <Button
            variant="ghost" // 使用幽灵按钮样式 (通常是透明背景)
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />

            {/* sr-only: 用于屏幕阅读器，提供按钮的语义描述，但视觉上隐藏 */}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}