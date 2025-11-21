// app/(login)/actions.ts
'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  users,
  teamMembers,
  ActivityType,
  invitations,
  TeamRole,
} from '@/lib/db/schema';
import { hashPassword, setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUser, getUserWithTeamID } from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import { createSupabaseAdminClient, createSupabaseClient } from '@/lib/db/server';
import { syncSupabaseUserToDrizzle } from './_utils/drizzle-user-sync';
import { logActivity } from './_utils/log-activity';
import { pkuEmailSchema } from './_utils/email-validation';
import { handleTeamAndInvitation } from './_utils/team-setup';

// 发送验证码的Schema，直接使用 pkuEmailSchema
const sendVerificationCodeSchema = z.object({
  email: pkuEmailSchema, // <--- 使用模块化的邮箱验证 Schema
});

// 注册的Schema
const signUpSchema = z.object({
  email: pkuEmailSchema, // <--- 使用模块化的邮箱验证 Schema
  password: z
    .string()
    .min(8, '密码至少需要8个字符')
    .max(100, '密码不能超过100个字符'),
  verificationCode: z
    .string()
    .length(6, '验证码必须是6位数字')
    .regex(/^\d+$/, '验证码必须是数字'),
  inviteId: z.string().optional(),
});

// 登录的Schema (保持不变)
const signInSchema = z.object({
  email: z.string().email('无效的邮箱格式').min(3, '邮箱至少3个字符').max(255, '邮箱不能超过255个字符'),
  password: z.string().min(8, '密码至少需要8个字符').max(100, '密码不能超过100个字符')
});

// --- Server Actions ---

// 1. 发送验证码 (OTP)
export const sendVerificationCode = validatedAction(sendVerificationCodeSchema, async (data) => {
  const { email } = data;

  // 1. 邮箱格式验证
  const emailValidation = pkuEmailSchema.safeParse(email);
  if (!emailValidation.success) {
    return {
      error: '注册邮箱必须是北京大学学生邮箱（@stu.pku.edu.cn格式）。',
      isCodeSentSuccessfully: false,
      email,
    };
  }

  const supabase = await createSupabaseClient();

  // 2. 检查 Drizzle 数据库中是否已存在此邮箱的用户
  const existingUserInDrizzle = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then(rows => rows[0]);

  if (existingUserInDrizzle) {
    console.warn(`User ${email} already found in Drizzle. Preventing new OTP for signup.`);
    return {
      error: `邮箱 ${email} 已被注册。如果您是该用户，请直接登录。`,
      isCodeSentSuccessfully: false,
      email,
    };
  }

  // 3. 直接使用 Supabase 发送 OTP
  const { error: supabaseError, data: otpData } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // 允许 Supabase 在用户不存在时创建新用户
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email`,
    },
  });

  if (supabaseError) {
    console.error('Supabase send OTP error:', supabaseError.message);

    if (supabaseError.message.includes('Email already registered')) {
      return {
        error: `邮箱 ${email} 已在系统中注册。请尝试登录。`,
        isCodeSentSuccessfully: false,
        email,
      };
    }
    return {
      error: '发送验证码失败，请稍后再试或检查邮箱。',
      isCodeSentSuccessfully: false,
      email,
    };
  }

  // 如果成功，data.user 或 data.session 可能为 null，但验证码已发送
  console.log(`Verification code sent to ${email}. OTP Data:`, otpData);

  return {
    isCodeSentSuccessfully: true,
    email,
  };
});

// 2. 注册
export const signUp = validatedAction(signUpSchema, async (data) => {
  const { email, password, verificationCode, inviteId } = data;

  const supabase = await createSupabaseClient();

  // --- 步骤 1: 使用 Supabase 验证 OTP ---
  const { data: supabaseAuthData, error: otpVerifyError } = await supabase.auth.verifyOtp({
    email,
    token: verificationCode,
    type: 'email',
  });

  if (otpVerifyError || !supabaseAuthData.user) {
    console.error('Supabase OTP verification error:', otpVerifyError?.message);
    return {
      error: otpVerifyError?.message || '验证码无效或已过期，请重新尝试。',
      email,
      password,
      verificationCode,
    };
  }

  const supabaseUser = supabaseAuthData.user;

  // 再次检查 email，确保它是有效的 string，尽管 Zod schema 已经验证
  if (typeof supabaseUser.email !== 'string') {
    console.error('Supabase user email is invalid after OTP verification. User:', supabaseUser);
    return {
      error: '注册失败：用户信息不完整或无效。',
      email,
      password,
      verificationCode,
    };
  }

  // --- 步骤 2: 在 Supabase Auth 中设置用户密码 (如果尚未设置或需要重置) ---
  const { error: setPasswordError } = await supabase.auth.updateUser({
    password: password,
  });

  if (setPasswordError) {
    console.error('Error setting Supabase user password during signup:', setPasswordError.message);
    return {
      error: setPasswordError.message || '系统错误：无法完成密码设置。请联系管理员。',
      email,
      password,
      verificationCode,
    };
  }

  // --- 步骤 3: 将 Supabase 用户同步到 Drizzle 数据库 (使用模块化函数) ---
  const createdUserInDrizzle = await syncSupabaseUserToDrizzle(
    {
      id: supabaseUser.id,
      email: supabaseUser.email,
      user_metadata: supabaseUser.user_metadata,
    },
    password
  );
  if (!createdUserInDrizzle) {
    return {
      error: '内部错误：创建或同步用户失败。请联系管理员。',
      email,
      password,
      verificationCode,
    };
  }

  // --- 步骤 4: 处理团队创建/加入 (使用模块化函数) ---
  const teamSetupResult = await handleTeamAndInvitation(
    createdUserInDrizzle.id,
    email,
    inviteId
  );

  if (teamSetupResult.error) {
    return {
      error: `团队处理失败：${teamSetupResult.error}`,
      email,
      password,
      verificationCode,
    };
  }

  // --- 步骤 5: 设置自定义 Session 并重定向 ---
  await setSession(createdUserInDrizzle);
  redirect('/dashboard');
});

// 3. 登录
export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const supabase = await createSupabaseClient();
  const { data: authData, error: supabaseError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (supabaseError) {
    console.error('Supabase signInWithPassword error:', supabaseError.message);
    return {
      error: '登录失败：无效的邮箱或密码，请重新尝试。',
      email,
      password: '',
    };
  }

  const supabaseUser = authData.user;
  if (!supabaseUser || typeof supabaseUser.email !== 'string') {
    console.error('Supabase user object or its email is invalid after successful sign-in. User:', supabaseUser);
    return {
      error: '登录失败：用户信息不完整或无效，请联系管理员。',
      email,
      password: '',
    };
  }

  const foundUserInDrizzle = await syncSupabaseUserToDrizzle(
    {
      id: supabaseUser.id,
      email: supabaseUser.email,
      user_metadata: supabaseUser.user_metadata,
    },
    password
  );

  if (!foundUserInDrizzle) {
    console.error(`Failed to sync Supabase user ${supabaseUser.id} to Drizzle DB.`);
    return { error: '登录失败：无法同步完善用户信息。请联系管理员。', email, password: '' };
  }

  const userWithTeam = await getUserWithTeamID(foundUserInDrizzle.id);

  await Promise.all([
    setSession(foundUserInDrizzle),
    logActivity(userWithTeam?.teamId, foundUserInDrizzle.id, ActivityType.SIGN_IN)
  ]);

  redirect('/dashboard');
});

// 4. 登出
export async function signOut() {
  const supabase = await createSupabaseClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    // 假设 user 对象中包含 supabaseId
    if (!user.supabaseId) {
      return { error: '无法更新密码：用户未链接到 Supabase Auth', currentPassword, newPassword, confirmPassword };
    }

    // 通过 Supabase 验证当前密码
    const supabase = await createSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: '原有密码错误！'
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: '新密码必须不同于原有密码！'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: '新密码与再次输入的新密码不一致！'
      };
    }

    // 通过 Supabase 更新密码
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      console.error('Supabase update password error:', updateError.message);
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: '更新密码失败，请稍后再试。'
      };
    }

    const userWithTeam = await getUserWithTeamID(user.id);

    await Promise.all([
      // Drizzle 的 passwordHash 字段可以更新，也可以因为 Supabase 是主密码源而留空
      // 如果 Drizzle 存储了 hash，这里需要更新，但不是必要。
      hashPassword(newPassword).then(newHash => db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id))),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
    ]);

    return {
      success: '密码更新成功'
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    // 假设 user 对象中包含 supabaseId
    if (!user.supabaseId) {
      return { error: '无法注销账号：用户未链接到 Supabase Auth', password };
    }

    // 通过 Supabase 验证密码
    const supabase = await createSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (signInError) {
      return {
        password,
        error: '密码错误，账号注销失败'
      };
    }

    const userWithTeam = await getUserWithTeamID(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

    // Soft delete Drizzle user
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`, // Ensure email uniqueness
        supabaseId: sql`CONCAT(supabase_id, '-deleted')`, // Ensure supabaseId uniqueness
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

    // Supabase Auth 也需要删除用户，但这通常需要 Service Role Key 或在客户端完成，
    // 这里如果只进行软删除，Supabase Auth中的用户仍存在。
    // 如果要彻底删除，需要高级权限。
    // await supabase.auth.admin.deleteUser(user.supabaseId); // 例如，需要admin权限

    (await cookies()).delete('session');
    redirect('/');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, '必须输入昵称').max(100),
  email: z.string().email('无效的邮箱') // 邮箱更新可能更复杂，因为需要重新验证
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;

    const userWithTeam = await getUserWithTeamID(user.id);

    // 如果邮箱发生变化，需要通过 Supabase Auth 更新，并可能需要重新验证
    if (email !== user.email) {
      console.warn("Email change detected. This requires a re-verification process which is not implemented here.");
      // return { error: "邮箱修改需要额外的验证，请联系管理员或稍后再试。" };
    }

    const supabase = await createSupabaseClient();
    // 更新 Supabase Auth 中的用户元数据 (名称)
    const { error: supabaseUpdateError } = await supabase.auth.updateUser({
      data: { name: name },
      // email: email // 如果支持邮箱更改且已验证，可以在此更新
    });

    if (supabaseUpdateError) {
      console.error('Supabase update user profile error:', supabaseUpdateError.message);
      return { name, error: '更新用户信息失败，请稍后再试。' };
    }

    await Promise.all([
      db.update(users).set({ name, email }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

    return { name, success: '账号信息更新成功' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.string()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeamID(user.id);

    if (!userWithTeam?.teamId) {
      return { error: '用户非团队成员' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    return { success: '团队成员成功移除' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(Object.values(TeamRole) as [TeamRole, ...TeamRole[]])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeamID(user.id);

    if (!userWithTeam?.teamId) {
      return { error: '用户非团队成员' };
    }

    // 检查是否存在于 Drizzle 的 users 表中，并链接到当前团队
    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: '用户已加入团队' };
    }

    // 检查是否存在邀请
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: '当前邮箱已收到邀请' };
    }

    // 创建新邀请
    await db.insert(invitations).values({
      teamId: userWithTeam.teamId,
      email,
      role,
      invitedBy: user.id,
      status: 'pending'
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // 注意：这里的邀请邮件可能需要指向你的 sendVerificationCode 流程的注册页面
    // 例如：await sendInvitationEmail(email, userWithTeam.team.name, role, `URL_TO_SIGNUP_WITH_INVITEID?inviteId=${invitation.id}`)

    return { success: '邀请发送成功' };
  }
);