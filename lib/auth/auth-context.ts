// @/lib/auth/auth-context.ts
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';
import { UserRole } from '@/lib/db/schema';


export interface CurrentUserContext {
    id: string | null;
    email: string | null;
    role: UserRole | null;
}

/**
 *将提供的用户上下文应用到数据库会话中
 * @param userCtx 认证的用户上下文
 */
export async function applyRlsSessionContext(userCtx: CurrentUserContext): Promise<void> {
    const userId = userCtx.id || null;
    const userEmail = userCtx.email || null;
    const userRole = userCtx.role || null;

    try {
        // 使用 set_config 函数，并明确进行::text转换，以安全地设置会话变量
        await db.execute(sql`SELECT set_config('app.user_id', ${userId}::uuid::text, false);`);
        await db.execute(sql`SELECT set_config('app.user_email', ${userEmail}::text, false);`);
        await db.execute(sql`SELECT set_config('app.user_role', ${userRole}::text, false);`);
        console.log(`RLS session context set for user: ${userId || 'N/A'}, role: ${userRole}`);
    } catch (error) {
        console.error('Failed to set RLS session context:', error);
        throw new Error('Failed to apply RLS session context to database session.');
    }
}
