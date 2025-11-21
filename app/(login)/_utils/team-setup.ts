// app/(login)/_utils/team-setup.ts
import { db } from '@/lib/db/drizzle';
import {
    invitations,
    teams,
    teamMembers,
    NewTeam,
    NewTeamMember,
    TeamRole,
    ActivityType,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logActivity } from './log-activity';


/**
 * 处理用户的团队创建或加入逻辑。
 * 如果提供了 inviteId，则尝试加入现有团队；否则，创建新团队。
 * @param drizzleUserId 用户的 Drizzle ID。
 * @param email 用户的邮箱。
 * @param inviteId 可选的邀请 ID。
 * @returns 团队 ID 和成员角色，或错误信息。
 */
export async function handleTeamAndInvitation(
    drizzleUserId: string,
    email: string,
    inviteId?: string
): Promise<{ teamId: string; teamRole: TeamRole; error?: string }> {
    let teamId: string;
    let teamRole: TeamRole;
    let createdTeam: typeof teams.$inferSelect | null = null;

    if (inviteId) {
        const [invitation] = await db
            .select()
            .from(invitations)
            .where(
                and(
                    eq(invitations.id, inviteId),
                    eq(invitations.email, email),
                    eq(invitations.status, 'pending')
                )
            )
            .limit(1);

        if (invitation) {
            teamId = invitation.teamId;
            teamRole = invitation.role;

            await db
                .update(invitations)
                .set({ status: 'accepted' })
                .where(eq(invitations.id, invitation.id));

            await logActivity(
                teamId,
                drizzleUserId,
                ActivityType.ACCEPT_INVITATION
            );

            [createdTeam] = await db
                .select()
                .from(teams)
                .where(eq(teams.id, teamId))
                .limit(1);
        } else {
            return { teamId: '', teamRole: TeamRole.MEMBER, error: '无效的或过期的邀请' };
        }
    } else {
        const newTeam: NewTeam = {
            name: `${email.split('@')[0]}'s Team`, // 使用邮箱前缀作为团队名
        };

        [createdTeam] = await db.insert(teams).values(newTeam).returning();

        if (!createdTeam) {
            return { teamId: '', teamRole: TeamRole.MEMBER, error: '创建团队失败，请重新尝试' };
        }

        teamId = createdTeam.id;
        teamRole = TeamRole.OWNER;

        await logActivity(teamId, drizzleUserId, ActivityType.CREATE_TEAM);
    }

    if (!teamId) {
        // 理论上不会发生，因为上面已经赋值
        return { teamId: '', teamRole: TeamRole.MEMBER, error: '未能确定团队ID' };
    }

    // 创建团队成员
    const newTeamMember: NewTeamMember = {
        userId: drizzleUserId,
        teamId: teamId,
        role: teamRole,
    };

    await db.insert(teamMembers).values(newTeamMember);

    return { teamId, teamRole };
}