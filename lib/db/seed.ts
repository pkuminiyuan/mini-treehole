// @/lib/db/seed.ts
// 用于注入 database 原始数据的脚本
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

async function seed() {
  console.log('--- Starting seed process ---');

  // --- 1. 创建特殊用户 ---
  // 这些用户ID是硬编码的，需要在数据库中事先存在以满足外键约束
  // 使用 onConflictDoNothing() 确保幂等性
  const passwordHashForAdmin = await hashPassword('pkuminiyuan');
  const passwordHashForSpecialUsers = await hashPassword('specialpassword');

  await db
    .insert(users)
    .values([
      {
        id: SpecialUserId.SYSTEM_USER_ID,
        email: 'pku@example.com', // 区分于普通用户的邮箱，用于系统内部操作或管理员
        name: 'miniyuan',
        passwordHash: passwordHashForAdmin,
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: SpecialUserId.ANONYMOUS_USER_ID,
        email: "anonymous@example.com",
        name: 'Anonymous User',
        passwordHash: passwordHashForSpecialUsers,
        role: UserRole.ANONYMOUS,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: SpecialUserId.DELETED_USER_ID,
        email: "deleted@example.com",
        name: 'Deleted User',
        passwordHash: passwordHashForSpecialUsers,
        role: UserRole.GOAST,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: SpecialUserId.MYSTERIOUS_USER_ID,
        email: "mysterious@example.com",
        name: 'Mysterious User',
        passwordHash: passwordHashForSpecialUsers,
        role: UserRole.GOAST,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .onConflictDoNothing({ target: users.id }); // 如果ID已存在则不冲突，即不插入
  console.log('Special users ensured to exist.');

  // --- 2. 创建一个测试用户 ---
  const passwordHash = await hashPassword('test123');

  const [testUser] = await db
    .insert(users)
    .values([
      {
        // 允许 defaultRandom() 生成一个真实的 UUID
        name: 'Test User',
        email: 'test@test.com',
        passwordHash: passwordHash,
        role: UserRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .onConflictDoUpdate({
      target: users.email, // 如果email冲突，则更新
      set: {
        name: 'Test User',
        passwordHash: passwordHash,
        role: UserRole.MEMBER,
        updatedAt: new Date(),
      },
    })
    .returning(); // 返回新创建或更新的用户

  console.log(`Test user '${testUser.email}' created/updated with ID: ${testUser.id}.`);

  // --- 3. 创建一个测试团队 ---
  const [testTeam] = await db
    .insert(teams)
    .values({
      // 允许 defaultRandom() 生成一个真实的 UUID
      name: 'Test Team',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`Test team '${testTeam.name}' created/updated with ID: ${testTeam.id}.`);

  // --- 4. 添加测试用户到测试团队 ---
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

  // --- 5. 创建一些留言 ---
  const [post1] = await db.insert(posts).values({
    authorId: SpecialUserId.SYSTEM_USER_ID,
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

  // --- 6. 创建点赞 ---
  await db.insert(likes).values([
    {
      userId: testUser.id,
      postId: post1.id,
      createdAt: new Date(),
    },
    {
      userId: testUser.id,
      postId: post2.id, // 用户可以点赞匿名帖子
      createdAt: new Date(),
    },
  ]).onConflictDoNothing({ target: [likes.userId, likes.postId] }); // 避免重复点赞
  console.log(`${testUser.name} liked posts ${post1.id} and ${post2.id}.`);

  // --- 7. 创建收藏 ---
  await db.insert(bookmarks).values([
    {
      userId: testUser.id,
      postId: post1.id,
      createdAt: new Date(),
    },
  ]).onConflictDoNothing({ target: [bookmarks.userId, bookmarks.postId] }); // 避免重复收藏
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