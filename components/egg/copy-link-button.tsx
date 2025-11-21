// @/components/egg/copy-link-button.tsx
// 链接按钮
"use client";
import React from "react";

export default function CopyLinkButton() {
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(location.href);
            // 这里简单使用 alert；若项目有 toast 组件可替换为更好的提示
            alert("已复制链接到剪贴板");
        } catch (e) {
            alert("复制失败，请手动复制");
        }
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="inline-block px-4 py-2 rounded-[var(--radius-sm)] bg-first text-first-foreground text-sm font-medium shadow-sm hover:opacity-90 transition"
        >
            复制链接
        </button>
    );
}