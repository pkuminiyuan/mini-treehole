// @/lib/db/queries.ts
// 负责与 database 进行交互
import { desc, and, eq, sql, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import {
  users,
  teamMembers,
  activityLogs,
  posts,
  likes,
  bookmarks,
  NewPost,
  User,
  Post,
  SpecialUserId,
} from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

/**
 * 从会话中获取当前登录用户
 * @returns Promise<User | null>
 */
export async function getUser(): Promise<User | null> {
  const cookieStore = await cookies(); // 访问 cookies
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  let sessionData;
  try {
    sessionData = await verifyToken(sessionCookie.value);
  } catch (error) {
    // 捕获到 JWT 验证失败（如过期、签名不符），应清除过期或无效的 cookie
    cookieStore.set('session', '', { expires: new Date(0) });
    return null;
  }

  if (
    !sessionData ||
    typeof sessionData.userId !== 'string' ||
    typeof sessionData.userEmail !== 'string'
  ) {
    return null;
  }

  if (new Date() > new Date(sessionData.exp * 1000)) {
    // 清除过期 cookie
    cookieStore.set('session', '', { expires: new Date(0) });
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.userId), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

/**
 * 获取询问用户所处团队 ID
 * @param userId
 * @returns Promise<{ user: User | null, teamId: string | null }>
 */
export async function getUserWithTeamID(userId: string):
  Promise<{ user: User | null, teamId: string | null }> {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

/**
 * 获取当前用户的活动日志
 * @returns Promise<Array<{ id: number; action: string; timestamp: Date;
 *  ipAddress: string | null; userName: string | null; }>>
 */
export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('用户未认证');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

/**
 * 获取当前用户的团队信息
 * @returns Promise<any | null>
 */
export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}

export type PostWithAuthorAndStats = Post & {
  author: Pick<User, 'id' | 'name'>;
  likeCount: number;
  isLikedByUser: boolean;
  isBookmarkedByUser: boolean;
  repliesCount: number; // 回复数量
  // 可选：添加 parentPost 字段，用于获取回复的父留言信息 (如果你需要显示“回复XXX”的功能)
  // parentPost?: Pick<Post, 'id' | 'content' | 'isAnonymous'> & {
  //   author: Pick<User, 'id' | 'name'> | null;
  // };
};

// 返回数据和总数的类型
export type PostsQueryResult = {
  posts: PostWithAuthorAndStats[];
  totalCount: number;
};

// 有关留言的查询器
export function createPostBaseQuery(userId: string) {
  return db
    .select({
      post: posts,
      author: {
        id: users.id,
        name: users.name,
        deletedAt: users.deletedAt,
      },
      likeCount: sql<number>`count(DISTINCT ${likes.id})`.mapWith(Number).as('likeCount'),
      isLikedByUser: sql<boolean>`CASE WHEN count(DISTINCT CASE WHEN ${likes.userId} = ${userId} THEN ${likes.id} ELSE null END) > 0 THEN TRUE ELSE FALSE END`.as('isLikedByUser'),
      isBookmarkedByUser: sql<boolean>`CASE WHEN count(DISTINCT CASE WHEN ${bookmarks.userId} = ${userId} THEN ${bookmarks.id} ELSE null END) > 0 THEN TRUE ELSE FALSE END`.as('isBookmarkedByUser'),
      repliesCount: sql<number>`(
        SELECT COUNT(*) FROM posts AS p2 WHERE p2.parent_id = posts.id
      )`.mapWith(Number).as('repliesCount'),
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .leftJoin(likes, eq(likes.postId, posts.id))
    .leftJoin(bookmarks, eq(bookmarks.postId, posts.id));
}

// 有关收藏的查询器
export function createBookmarkBaseQuery(userId: string) {
  return db
    .select({
      post: posts,
      author: {
        id: users.id,
        name: users.name,
        deletedAt: users.deletedAt,
      },
      likeCount: sql<number>`count(DISTINCT ${likes.id})`.mapWith(Number).as('likeCount'),
      isLikedByUser: sql<boolean>`CASE WHEN count(DISTINCT CASE WHEN ${likes.userId} = ${userId} THEN ${likes.id} ELSE null END) > 0 THEN TRUE ELSE FALSE END`.as('isLikedByUser'),
      isBookmarkedByUser: sql<boolean>`TRUE`.as('isBookmarkedByUser'),
      repliesCount: sql<number>`(
        SELECT COUNT(*) FROM posts AS p2 WHERE p2.parent_id = posts.id
      )`.mapWith(Number).as('repliesCount'),
    })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(users, eq(posts.authorId, users.id))
    .leftJoin(likes, eq(likes.postId, posts.id));
}

// 原始数据类型
export type RawPostResult = {
  post: Post;
  author: { id: string; name: string | null; deletedAt: Date | null } | null;
  likeCount: number;
  isLikedByUser: boolean;
  isBookmarkedByUser: boolean;
  repliesCount: number;
};

// 格式化函数与批量格式化函数
export function formatPost(rawPost: RawPostResult): PostWithAuthorAndStats {
  const { post, likeCount, isLikedByUser, isBookmarkedByUser, repliesCount } = rawPost;

  const getAuthorInfo = (rawPost: RawPostResult) => {
    if (!rawPost.author) {
      return { id: SpecialUserId.MYSTERIOUS_USER_ID, name: '神秘用户' };
    }

    if (rawPost.post.isAnonymous) {
      return { id: SpecialUserId.ANONYMOUS_USER_ID, name: '匿名用户' };
    }

    if (!rawPost.author.deletedAt) {
      return { id: rawPost.author.id, name: rawPost.author.name };
    }

    if (rawPost.author.deletedAt) {
      return { id: SpecialUserId.DELETED_USER_ID, name: '消失的用户' };
    }

    return { id: SpecialUserId.MYSTERIOUS_USER_ID, name: '神秘用户' };
  }

  return {
    ...post,
    author: getAuthorInfo(rawPost),
    likeCount,
    isLikedByUser,
    isBookmarkedByUser,
    repliesCount,
  };
}
export function formatPosts(rawPosts: RawPostResult[]): PostWithAuthorAndStats[] {
  return rawPosts.map(formatPost);
}

/**
 * 获取按时间倒序排列的顶层留言列表（支持分页）
 * 包含作者信息、点赞数、当前用户是否已点赞/收藏，以及回复数量。
 * @param offset 查询偏移量
 * @param limit 查询数量
 * @returns Promise<PostsQueryResult> 留言列表
 */
export async function getTopLevelPosts(
  offset: number = 0,
  limit: number = 10,
): Promise<PostsQueryResult> {
  const user = await getUser();

  if (!user) {
    throw new Error('用户未认证');
  }

  const baseQuery = createPostBaseQuery(user.id);

  const result = await baseQuery
    .where(isNull(posts.parentId)) // 只选择顶层留言 (parentId 为 null)
    .groupBy(posts.id, users.id) // 按留言ID和用户ID分组以便聚合函数工作
    .orderBy(desc(posts.createdAt)) // 按创建时间倒序
    .offset(offset)
    .limit(limit);

  const formattedPosts = formatPosts(result);

  const [totalResult] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`.as('count'),
    })
    .from(posts)
    .where(isNull(posts.parentId)); // 同样只计算顶层留言的总数

  const totalCount = totalResult?.count || 0;

  return { posts: formattedPosts, totalCount: totalCount };
}

/**
 * 获取指定留言的详细信息 (包括其父留言信息，如果它是回复)
 * @param postId 留言ID
 * @returns Promise<PostWithAuthorAndStats | null> 返回留言对象或 null
 */
export async function getPostById(postId: string): Promise<PostWithAuthorAndStats | null> {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const baseQuery = createPostBaseQuery(user.id);

  const result = await baseQuery
    .where(eq(posts.id, postId))
    .groupBy(posts.id, users.id)
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return formatPost(result[0]);
}

/**
 * 获取指定留言的回复列表（支持分页）
 * @param parentId 父留言的ID
 * @param offset 查询偏移量
 * @param limit 查询数量
 * @returns Promise<PostWithAuthorAndStats[]> 回复列表
 */
export async function getRepliesForPost(
  parentId: string,
  offset: number = 0,
  limit: number = 10,
): Promise<PostWithAuthorAndStats[]> {
  const user = await getUser();

  if (!user) {
    throw new Error('用户未认证');
  }

  const baseQuery = createPostBaseQuery(user.id);

  const result = await baseQuery
    .where(eq(posts.parentId, parentId)) // 筛选指定父留言的子留言
    .groupBy(posts.id, users.id)
    .orderBy(desc(posts.createdAt))
    .offset(offset)
    .limit(limit);

  return formatPosts(result);
}

/**
 * 创建一篇新留言或回复
 * @param data 包含 authorId, content, isAnonymous, parentId (可选)
 * @returns Promise<Post> 返回创建的留言对象
 */
export async function createPost(data: NewPost): Promise<Post> {
  const [newPost] = await db.insert(posts).values(data).returning();
  if (!newPost) {
    throw new Error('创建留言失败');
  }
  return newPost;
}

/**
 * 更新一篇留言的内容或匿名状态（仅限作者本人）
 * @param postId 留言 ID
 * @param authorId 发送更新请求的用户 ID
 * @param newContent 新的留言内容
 * @param newIsAnonymous 新的匿名状态
 * @returns Promise<Post | null> 返回更新后的留言对象或 null
 */
export async function updatePost(
  postId: string,
  authorId: string,
  newContent: string,
  newIsAnonymous: boolean,
): Promise<Post | null> {
  const [updatedPost] = await db
    .update(posts)
    .set({
      content: newContent,
      isAnonymous: newIsAnonymous,
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, postId), eq(posts.authorId, authorId))) // 只有作者能更新
    .returning();
  return updatedPost || null;
}

/**
 * 删除一篇留言。仅限作者本人
 * @param postId 留言ID
 * @param authorId 发送删除请求的用户ID (用于权限检查)
 * @returns Promise<boolean> 删除成功返回 true，失败返回 false
 */
export async function deletePost(postId: string, authorId: string): Promise<boolean> {
  const result = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.authorId, authorId))) // 增加作者ID匹配
    .returning();
  return result.length > 0;
}

/**
 * 切换用户对留言的点赞状态（点赞 / 取消点赞）
 * @param userId 用户ID
 * @param postId 留言ID
 * @returns Promise<{ liked: boolean, likeCount: number }> 返回点赞状态和新的点赞总数
 */
export async function toggleLike(userId: string, postId: string): Promise<{ liked: boolean, likeCount: number }> {
  const existingLike = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
    .limit(1);

  let liked = false;
  if (existingLike.length > 0) {
    // 已点赞，则取消点赞
    await db.delete(likes).where(eq(likes.id, existingLike[0].id));
    liked = false;
  } else {
    // 未点赞，则添加点赞
    await db.insert(likes).values({ userId, postId }).returning();
    liked = true;
  }

  const likeCount = await getLikeCountForPost(postId);
  return { liked, likeCount };
}

/**
 * 获取一篇留言的点赞总数
 * @param postId 留言ID
 * @returns Promise<number> 点赞总数
 */
export async function getLikeCountForPost(postId: string): Promise<number> {
  const [result] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`.as('count'), // 确保返回数值类型
    })
    .from(likes)
    .where(eq(likes.postId, postId));
  return result?.count || 0;
}

/**
 * 切换用户对留言的收藏状态（收藏 / 取消收藏）
 * @param userId 用户ID
 * @param postId 留言ID
 * @returns Promise<boolean> 添加收藏返回 true, 取消收藏返回 false
 */
export async function toggleBookmark(userId: string, postId: string): Promise<boolean> {
  const existingBookmark = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)))
    .limit(1);

  if (existingBookmark.length > 0) {
    // 已收藏，则取消收藏
    await db.delete(bookmarks).where(eq(bookmarks.id, existingBookmark[0].id));
    return false; // 取消收藏
  } else {
    // 未收藏，则添加收藏
    await db.insert(bookmarks).values({ userId, postId }).returning();
    return true; // 添加收藏
  }
}

/**
 * 检查用户是否已收藏某篇留言
 * @param userId 用户ID
 * @param postId 留言ID
 * @returns Promise<boolean>
 */
export async function userHasBookmarkedPost(
  userId: string,
  postId: string
): Promise<boolean> {
  const existingBookmark = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)))
    .limit(1);
  return existingBookmark.length > 0;
}

/**
 * 获取用户收藏的留言列表（支持分页）
 * @param userId 用户ID
 * @param offset 查询偏移量
 * @param limit 查询数量
 * @returns Promise<PostsQueryResult> 收藏的留言列表
 */
export async function getBookmarkedPosts(
  userId: string,
  offset: number = 0,
  limit: number = 10
): Promise<PostsQueryResult> {
  const baseQuery = createBookmarkBaseQuery(userId);

  const result = await baseQuery
    .where(eq(bookmarks.userId, userId))
    .groupBy(posts.id, users.id)
    .orderBy(desc(posts.createdAt))
    .offset(offset)
    .limit(limit);

  const formattedBookmarkedPosts = formatPosts(result);

  const [totalResult] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`.as('count'),
    })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId)); // 只计数当前用户收藏的总数

  const totalCount = totalResult?.count || 0;

  return { posts: formattedBookmarkedPosts, totalCount: totalCount };
}
