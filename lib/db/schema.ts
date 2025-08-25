// @/lib/db/schema.ts
// 用于规范 database 表单结构
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  foreignKey,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export enum SpecialUserId {
  SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000',
  ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000001',
  DELETED_USER_ID = '00000000-0000-0000-0000-000000000002',
  MYSTERIOUS_USER_ID = '00000000-0000-0000-0000-000000000003'
}

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  GOAST = 'goast',
  ANONYMOUS = 'anonymous',
}

export enum TeamRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

// 用户表
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 })
    .$type<UserRole>()
    .notNull()
    .default(UserRole.MEMBER),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'), // 软删除
});

// 团队表
export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 团队成员表
export const teamMembers = pgTable('team_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id),
    role: varchar('role', { length: 20 })
      .$type<TeamRole>()
      .notNull(),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    userTeamUnique: unique('user_team_unique').on(table.userId, table.teamId),
  })
);

// 活动日志表
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

// 邀请表
export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 })
    .$type<TeamRole>()
    .notNull(),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

// 留言表
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'no action' }),
    content: text('content').notNull(),
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    parentId: uuid('parent_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // 自引用外键
    parentFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'posts_parent_id_fkey',
    }).onDelete('no action'),
  })
);

// 点赞表
export const likes = pgTable(
  'likes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'no action' }), // 外键，关联用户表
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'no action' }), // 外键，关联留言表
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // 添加复合唯一索引
    userPostLikeUnique: unique('user_post_like_unique').on(
      table.userId,
      table.postId
    ),
  })
);

// 收藏表
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'no action' }), // 外键，关联用户表
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'no action' }), // 外键，关联留言表
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // 添加复合唯一索引
    userPostBookmarkUnique: unique('user_post_bookmark_unique').on(
      table.userId,
      table.postId
    ),
  })
);

// 用户一对多关系
export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  posts: many(posts),
  likes: many(likes),
  bookmarks: many(bookmarks),
}));

// 团队一对多关系
export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

// 邀请多对一关系
export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId], // 本地字段
    references: [teams.id], // 目标字段
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

// 团队成员多对一关系
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

// 活动日志多对一关系
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// 留言一对多与多对一关系
export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  parent: one(posts, {
    // 多对一
    fields: [posts.parentId],
    references: [posts.id],
    relationName: 'childPosts', // 子留言的 parentID  => 父留言的 id
  }),
  children: many(posts, {
    // 一对多
    relationName: 'childPosts', // 父留言 => 子留言
  }),
  likes: many(likes),
  bookmarks: many(bookmarks),
}));

// 点赞多对一关系
export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

// 收藏多对一关系
export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [bookmarks.postId],
    references: [posts.id],
  }),
}));

export type User = typeof users.$inferSelect; // 选择
export type NewUser = typeof users.$inferInsert; // 插入
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;

export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}