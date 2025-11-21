// app/(login)/_utils/log-activity.ts
import { db } from '@/lib/db/drizzle';
import {
    ActivityType,
    type NewActivityLog,
    activityLogs,
} from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';

// 辅助函数：记录活动日志
export async function logActivity(
    teamId: string | null | undefined, // teamId 可以为空
    userId: string,
    type: ActivityType,
    ipAddress?: string
) {
    if (!teamId) { // 检查 teamId 是否存在
        console.warn(`Activity log for user ${userId} of type ${type} skipped due to missing teamId.`);
        return;
    }
    const newActivity: NewActivityLog = {
        teamId,
        userId,
        action: type,
        ipAddress: ipAddress || ''
    };
    await db.insert(activityLogs).values(newActivity);
    revalidatePath(`/dashboard/activity`); // 重新验证活动日志页面
}