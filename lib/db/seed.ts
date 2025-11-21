// @/lib/db/seed.ts
import { db } from './drizzle';
import {
  users,
  teams,
  teamMembers,
  posts,
  likes,
  bookmarks,
  SpecialUserId,
  UserRole,
  TeamRole,
} from './schema';
import { hashPassword } from '@/lib/auth/session';
import { createClient } from '@supabase/supabase-js';

// --- Supabase Admin Client Creation for Seed Script ---
function createSupabaseAdminClientForSeed() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
// --- end Supabase Admin Client Creation for Seed Script ---

async function seed() {
  console.log('--- Starting seed process ---');

  const supabase = createSupabaseAdminClientForSeed();

  const passwordForAdmin = 'pkuminiyuan';
  const passwordHashForAdmin = await hashPassword(passwordForAdmin);
  const passwordHashForSpecialUsers = await hashPassword('specialpassword');

  // --- 处理可登录的管理员用户 (miniyuan) ---
  let miniyuanSupabaseId: string | undefined;
  try {
    // 尝试查找现有用户
    const { data: { users: existingAuthUsers }, error: listUsersError } = await supabase.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error('Error listing existing users for miniyuan:', listUsersError.message);
      throw listUsersError;
    }

    const existingMiniyuan = existingAuthUsers?.find(u => u.email === 'miniyuan@example.com');

    if (existingMiniyuan) {
      miniyuanSupabaseId = existingMiniyuan.id;
      console.log(`miniyuan (admin) already existed in Supabase Auth with ID: ${miniyuanSupabaseId}`);
    } else {
      // 用户不存在，创建新用户
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'miniyuan@example.com',
        password: passwordForAdmin,
        email_confirm: true, // 关键：标记邮箱已验证，绕过验证流程
        user_metadata: { // 使用 user_metadata 来存储额外信息
          name: 'miniyuan',
          role: UserRole.ADMIN,
        },
      });

      if (createError) {
        console.error('Error creating miniyuan in Supabase Auth:', createError.message);
        throw createError;
      }
      if (newUser?.user) { // createUser 的 data.user 才是用户对象
        miniyuanSupabaseId = newUser.user.id;
        console.log(`miniyuan (admin) created in Supabase Auth with ID: ${miniyuanSupabaseId}`);
      }
    }
  } catch (error) {
    console.error('Failed to create or get miniyuan Supabase Auth user:', error);
    process.exit(1);
  }

  await db
    .insert(users)
    .values([
      {
        id: SpecialUserId.SYSTEM_USER_ID,
        supabaseId: miniyuanSupabaseId,
        email: 'miniyuan@example.com',
        name: 'miniyuan',
        passwordHash: passwordHashForAdmin,
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: SpecialUserId.ANONYMOUS_USER_ID,
        supabaseId: null,
        email: "anonymous@example.com",
        name: 'Anonymous User',
        passwordHash: passwordHashForSpecialUsers,
        role: UserRole.ANONYMOUS,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: SpecialUserId.DELETED_USER_ID,
        supabaseId: null,
        email: "deleted@example.com",
        name: 'Deleted User',
        passwordHash: passwordHashForSpecialUsers,
        role: UserRole.GOAST,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: SpecialUserId.MYSTERIOUS_USER_ID,
        supabaseId: null,
        email: "mysterious@example.com",
        name: 'Mysterious User',
        passwordHash: passwordHashForSpecialUsers,
        role: UserRole.GOAST,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .onConflictDoNothing({ target: users.id });
  console.log('Special users ensured to exist in Drizzle.');

  const testUserEmail = 'test@example.com';
  const testUserPassword = 'test123';
  const passwordHash = await hashPassword(testUserPassword);
  let testUserSupabaseId: string | undefined;

  try {
    // 尝试查找现有用户
    const { data: { users: existingAuthUsers }, error: listUsersError } = await supabase.auth.admin.listUsers();

    if (listUsersError) {
      console.error('Error listing existing users for test user:', listUsersError.message);
      throw listUsersError;
    }
    const existingTestUser = existingAuthUsers?.find(u => u.email === testUserEmail);

    if (existingTestUser) {
      testUserSupabaseId = existingTestUser.id;
      console.log(`Test user already existed in Supabase Auth with ID: ${testUserSupabaseId}`);
    } else {
      // 用户不存在，创建新用户
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testUserEmail,
        password: testUserPassword,
        email_confirm: true,
        user_metadata: {
          name: 'Test User',
          role: UserRole.MEMBER,
        },
      });

      if (createError) {
        console.error('Error creating Test User in Supabase Auth:', createError.message);
        throw createError;
      }
      if (newUser?.user) {
        testUserSupabaseId = newUser.user.id;
        console.log(`Test user created in Supabase Auth with ID: ${testUserSupabaseId}`);
      }
    }
  } catch (error) {
    console.error('Failed to create or get Test User Supabase Auth user:', error);
    process.exit(1);
  }

  const [testUser] = await db
    .insert(users)
    .values([
      {
        supabaseId: testUserSupabaseId,
        name: 'Test User',
        email: testUserEmail,
        passwordHash: passwordHash,
        role: UserRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: 'Test User',
        supabaseId: testUserSupabaseId,
        passwordHash: passwordHash,
        role: UserRole.MEMBER,
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log(`Test user '${testUser.email}' created/updated with ID: ${testUser.id} in Drizzle.`);

  const systemUserInDrizzle = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, SpecialUserId.SYSTEM_USER_ID),
  });
  if (!systemUserInDrizzle) {
    console.error('System user not found in Drizzle, this should not happen!');
    process.exit(1);
  }

  const [testTeam] = await db
    .insert(teams)
    .values({
      name: 'Test Team',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`Test team '${testTeam.name}' created/updated with ID: ${testTeam.id}.`);

  await db.insert(teamMembers)
    .values({
      userId: testUser.id,
      teamId: testTeam.id,
      role: TeamRole.OWNER,
      joinedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [teamMembers.userId, teamMembers.teamId],
      set: { role: TeamRole.OWNER, joinedAt: new Date() },
    });
  console.log(`Test user added to '${testTeam.name}' as owner.`);

  const [post1] = await db.insert(posts).values({
    authorId: systemUserInDrizzle.id,
    content: 'Hello World! This is miniyuan.',
    isAnonymous: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  console.log(`Post ID: ${post1.id} created by System Admin.`);

  const [post2] = await db.insert(posts).values({
    authorId: SpecialUserId.ANONYMOUS_USER_ID,
    content: 'This is an anonymous treehole message from nowhere...',
    isAnonymous: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  console.log(`Post ID: ${post2.id} created anonymously.`);

  const [post3] = await db.insert(posts).values({
    authorId: testUser.id,
    content: 'Who is miniyuan? (Reply to Post 1)',
    isAnonymous: false,
    parentId: post1.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  console.log(`Post ID: ${post3.id} created as a reply to Post 1.`);

  await db.insert(likes).values([
    {
      userId: testUser.id,
      postId: post1.id,
      createdAt: new Date(),
    },
    {
      userId: testUser.id,
      postId: post2.id,
      createdAt: new Date(),
    },
  ]).onConflictDoNothing({ target: [likes.userId, likes.postId] });
  console.log(`${testUser.name} liked posts ${post1.id} and ${post2.id}.`);

  await db.insert(bookmarks).values([
    {
      userId: testUser.id,
      postId: post1.id,
      createdAt: new Date(),
    },
  ]).onConflictDoNothing({ target: [bookmarks.userId, bookmarks.postId] });
  console.log(`${testUser.name} bookmarked post ${post1.id}.`);

  console.log('--- Seed process finished successfully ---');
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });