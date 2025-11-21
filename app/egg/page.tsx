// app/egg/page.tsx
import React from "react";
import CopyLinkButton from "@/components/egg/copy-link-button";

export const metadata = {
    title: "Egg — 彩蛋",
    description: "A tiny hidden page",
};

export default function EggPage() {
    return (
        <main className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
            <div className="max-w-lg w-full mx-auto">
                <div className="bg-card text-card-foreground border border-border rounded-[var(--radius-md)] shadow-md p-8 flex flex-col items-center gap-4">
                    <div
                        aria-hidden
                        className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-lg"
                        style={{
                            background: "linear-gradient(135deg,var(--brand-first),var(--brand-dark-first))",
                        }}
                    >
                        EGG
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-semibold text-first">
                        恭喜你发现了彩蛋！
                    </h1>

                    <p className="text-sm text-foreground text-center">
                        这是一个隐藏的彩蛋页面 <br></br>
                        CC will defeat NH!!!
                    </p>

                    <div className="mt-3 flex gap-3">
                        <a
                            href="/"
                            className="inline-block px-4 py-2 rounded-[var(--radius-sm)] bg-first text-first-foreground text-sm font-medium shadow-sm hover:opacity-90 transition"
                        >
                            回到首页
                        </a>

                        {/* 引用客户端组件来处理交互 */}
                        <CopyLinkButton />
                    </div>
                </div>
            </div>
        </main>
    );
}