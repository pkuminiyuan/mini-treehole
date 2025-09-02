// @/lib/auth/auth-context.ts
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';
import { UserRole } from '@/lib/db/schema';

export interface CurrentUserContext {
    id: string | null;
    email: string | null;
    role: UserRole | null;
}

// 缓存变量
let lastUserId: string | null = null;
let lastUserEmail: string | null = null;
let lastUserRole: UserRole | null = null;
let lastSetTime = 0;

// 配置
const CACHE_ENABLED = process.env.RLS_CACHE_ENABLED !== 'false'; // 默认启用
const CACHE_DURATION = parseInt(process.env.RLS_CACHE_DURATION || '1000', 10); // 默认1秒

/**
 * 将提供的用户上下文应用到数据库会话中
 * @param userCtx 认证的用户上下文
 */
export async function applyRlsSessionContext(userCtx: CurrentUserContext): Promise<void> {
    const userId = userCtx.id || null;
    const userEmail = userCtx.email || null;
    const userRole = userCtx.role || null;

    // 检查缓存
    if (CACHE_ENABLED && shouldSkipRlsSetting(userId, userEmail, userRole)) {
        console.log(`RLS context skipped (cached) for user: ${userId || 'N/A'}`);
        return;
    }

    try {
        // 使用单个查询设置所有配置，减少数据库往返
        await db.execute(sql`
            SELECT 
                set_config('app.user_id', ${userId}::uuid::text, false),
                set_config('app.user_email', ${userEmail}::text, false),
                set_config('app.user_role', ${userRole}::text, false)
        `);
        
        // 更新缓存
        updateCache(userId, userEmail, userRole);
        
        console.log(`RLS session context set for user: ${userId || 'N/A'}, role: ${userRole}`);
    } catch (error) {
        console.error('Failed to set RLS session context:', error);
        // 清除缓存以确保下次会重试
        clearRlsCache();
        throw new Error('Failed to apply RLS session context to database session.');
    }
}

/**
 * 检查是否应该跳过 RLS 设置（基于缓存）
 */
function shouldSkipRlsSetting(
    userId: string | null, 
    userEmail: string | null, 
    userRole: UserRole | null
): boolean {
    const now = Date.now();
    
    return (
        userId === lastUserId &&
        userEmail === lastUserEmail &&
        userRole === lastUserRole &&
        now - lastSetTime < CACHE_DURATION
    );
}

/**
 * 更新缓存
 */
function updateCache(
    userId: string | null, 
    userEmail: string | null, 
    userRole: UserRole | null
): void {
    if (CACHE_ENABLED) {
        lastUserId = userId;
        lastUserEmail = userEmail;
        lastUserRole = userRole;
        lastSetTime = Date.now();
    }
}

/**
 * 清除 RLS 缓存（用于测试或特殊情况）
 */
export function clearRlsCache(): void {
    lastUserId = null;
    lastUserEmail = null;
    lastUserRole = null;
    lastSetTime = 0;
    console.log('RLS cache cleared');
}