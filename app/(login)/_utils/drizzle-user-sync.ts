// app/(login)/_utils/drizzle-user-sync.ts
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, NewUser, UserRole } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/session'; // 假设你的哈希函数在这里

// 辅助类型，现在更精确地反映 Supabase User 对象的结构
interface SupabaseUser {
    id: string;
    email: string | undefined | null;
    user_metadata?: {
        name?: string;
        [key: string]: any;
    };
}

/**
 * 将 Supabase Auth 用户同步到 Drizzle 数据库。
 * 如果用户不存在，则创建；如果存在，则更新。
 * @param supabaseUser 从 Supabase Auth 获取的用户对象。
 * @param password 用户在注册或登录时提供的原始密码（用于哈希和存储）。
 * @returns 同步后的 Drizzle 用户对象，或 null 如果同步失败。
 */
export async function syncSupabaseUserToDrizzle(
    supabaseUser: SupabaseUser,
    password?: string
): Promise<typeof users.$inferSelect | null> {
    // 确保 Supabase User 有 ID 且邮箱不为空（或者提供一个默认邮箱）
    if (!supabaseUser.id || !supabaseUser.email) {
        console.error('Supabase user ID or email is missing for Drizzle sync. ID:', supabaseUser.id, 'Email:', supabaseUser.email);
        return null;
    }

    let createdUserInDrizzle: typeof users.$inferSelect | undefined;
    const hashedPassword = password ? await hashPassword(password) : undefined;

    // 尝试通过 supabaseId 查找 Drizzle 用户
    let existingUserInDrizzle = await db
        .select()
        .from(users)
        .where(eq(users.supabaseId, supabaseUser.id))
        .limit(1)
        .then((rows) => rows[0]);

    if (existingUserInDrizzle) {
        // 用户已存在，更新其信息
        const updateData: Partial<NewUser> = {};
        if (existingUserInDrizzle.email !== supabaseUser.email) {
            updateData.email = supabaseUser.email;
        }
        if (hashedPassword && (!existingUserInDrizzle.passwordHash || existingUserInDrizzle.passwordHash !== hashedPassword)) {
            updateData.passwordHash = hashedPassword;
        }
        // 同时也更新 name，避免在 Drizzle 中不同步
        const newName = supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0];
        if (existingUserInDrizzle.name !== newName) {
            updateData.name = newName;
        }

        if (Object.keys(updateData).length > 0) {
            const [updatedUser] = await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, existingUserInDrizzle.id))
                .returning();
            createdUserInDrizzle = updatedUser;
        } else {
            createdUserInDrizzle = existingUserInDrizzle;
        }
    } else {
        // 用户不存在，尝试通过 email 查找（以防 Supabase ID 变更或同步时序问题）
        existingUserInDrizzle = await db
            .select()
            .from(users)
            .where(eq(users.email, supabaseUser.email))
            .limit(1)
            .then((rows) => rows[0]);

        if (existingUserInDrizzle) {
            // 邮箱匹配，但 Supabase ID 不匹配，这通常是数据不一致的情况。
            // 我们在此更新 Drizzle 用户的 `supabaseId` 并更新其他信息。
            const updateData: Partial<NewUser> = { supabaseId: supabaseUser.id };
            if (hashedPassword && (!existingUserInDrizzle.passwordHash || existingUserInDrizzle.passwordHash !== hashedPassword)) {
                updateData.passwordHash = hashedPassword;
            }
            const newName = supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0];
            if (existingUserInDrizzle.name !== newName) {
                updateData.name = newName;
            }
            console.warn(
                `Drizzle user with email ${supabaseUser.email} found, but supabaseId mismatch. Updating Drizzle user.`
            );
            const [updatedUser] = await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, existingUserInDrizzle.id))
                .returning();
            createdUserInDrizzle = updatedUser;
        } else {
            // 既没有 Supabase ID 匹配，也没有邮箱匹配，创建新用户
            if (!hashedPassword) {
                console.error('Password is required to create a new Drizzle user when no existing user is found.');
                return null;
            }
            const newDrizzleUser: NewUser = {
                supabaseId: supabaseUser.id,
                email: supabaseUser.email, // 确保此处 email 是 string 类型，已被前面的 if (!supabaseUser.email) 检查
                passwordHash: hashedPassword,
                role: UserRole.MEMBER,
                name:
                    supabaseUser.user_metadata?.name ||
                    supabaseUser.email.split('@')[0] ||
                    '新用户',
            };
            const [tempUser] = await db.insert(users).values(newDrizzleUser).returning();
            createdUserInDrizzle = tempUser;
        }
    }

    return createdUserInDrizzle || null;
}