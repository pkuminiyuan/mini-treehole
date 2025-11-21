// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 这是一个用于服务器组件/Server Actions的标准Supabase客户端，
// 它通过session cookies管理用户会话。
// 注意：现在这个函数是异步的，所以在调用它的时候必须使用 await。
export async function createSupabaseClient() { // <-- 关注这里：添加 async 关键字
    // await cookies() 来获取实际的 cookies 实例
    const cookieStore: ReadonlyRequestCookies = await cookies(); // <-- 关注这里：添加 await

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    // 现在 cookieStore 已经是 ReadonlyRequestCookies 实例了，可以直接调用 .get()
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // The `cookies()` may be called only from a Server Component or Server Action.
                        // This error can be ignored if you're just trying to update a cookie from a Client Component in a Server Action
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // The `cookies()` may be called only from a Server Component or Server Action.
                        // This error can be ignored if you're just trying to update a cookie from a Client Component in a Server Action
                    }
                },
            },
        }
    );
}

export const createSupabaseAdminClient = (): SupabaseClient => {
    // 确保 SUPABASE_SERVICE_ROLE_KEY 环境变量存在
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env var!');
    }

    // 使用 createClient 而不是 createServerClient
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            // auth 选项通常用于客户端，对于 admin 客户端，不需要或使用不同的配置
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
};