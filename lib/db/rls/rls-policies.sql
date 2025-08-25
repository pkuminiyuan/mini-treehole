-- @/lib/db/rls/rls-policies.sql
-- 警告：这些函数和策略假设已认证用户的UUID、邮箱和角色信息
-- 可以通过应用程序设置的自定义会话变量获取。
--
-- 对于没有Supabase认证的本地Drizzle开发环境，你必须在执行数据库操作之前
-- 在应用程序代码中设置这些会话变量。
-- 示例：
--
SET SESSION "app.user_id" = '用户UUID';
--
SET SESSION "app.user_email" = 'user@example.com';
--
SET SESSION "app.user_role" = 'member';
-- 如果部署到Supabase，这些可能需要调整，或者Supabase的内置
-- 认证函数可能会覆盖或替换此方法。
-- 对于Supabase，'request.jwt.claims'会自动填充。

-- 辅助函数：从会话变量获取当前认证用户的UUID
-- 这替代了本地PostgreSQL中直接的'auth.uid()'调用
-- 为了Supabase兼容性，优先使用'request.jwt.claims'，然后回退到'app.user_id'
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN coalesce(
        (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid,
        current_setting('app.user_id', true)::uuid
    );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL; -- 如果会话变量未设置或格式错误，返回NULL
END;
$$;

-- 辅助函数：从会话变量获取当前认证用户的邮箱
-- 对于本地开发，在会话中设置'app.user_email'
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 首先尝试从JWT声明（Supabase方式）获取邮箱，然后回退到会话变量
    -- 注意：原先在 BEGIN 块内的 SET search_path = public; 语句已移至此处并修正
    RETURN coalesce(
        current_setting('request.jwt.claims', true)::jsonb->>'email',
        current_setting('app.user_email', true)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL; -- 如果会话变量未设置，返回NULL
END;
$$;

-- 辅助函数：从会话变量获取当前认证用户的角色
-- 对于本地开发，在会话中设置'app.user_role'
CREATE OR REPLACE FUNCTION public.get_user_jwt_role()
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 首先尝试从JWT声明（Supabase方式）获取角色，然后回退到会话变量
    -- 注意：原先在 BEGIN 块内的 SET search_path = public; 语句已移至此处并修正
    RETURN coalesce(
        current_setting('request.jwt.claims', true)::jsonb->>'role',
        current_setting('app.user_role', true)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL; -- 如果会话变量未设置，返回NULL
END;
$$;

--------------------------------------------------------------------------------
-- public.users表的行级安全策略(RLS)
--------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- SELECT策略：用户可以读取自己的个人资料，或者系统管理员可以读取所有用户
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
CREATE POLICY "Users can read their own profile"
ON public.users FOR SELECT
USING ( public.get_user_id() = id OR public.get_user_jwt_role() = 'admin' );

-- INSERT策略：用户可以创建自己的个人资料（通常在注册过程中处理）
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
CREATE POLICY "Users can create their own profile"
ON public.users FOR INSERT
WITH CHECK (public.get_user_id() = id);

-- UPDATE策略：用户可以更新自己的个人资料
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (public.get_user_id() = id)
WITH CHECK (public.get_user_id() = id);

-- DELETE策略：用户可以删除自己的个人资料
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;
CREATE POLICY "Users can delete their own profile"
ON public.users FOR DELETE
USING (public.get_user_id() = id);

--------------------------------------------------------------------------------
-- public.teams表的行级安全策略
--------------------------------------------------------------------------------
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
-- SELECT策略：用户可以读取他们所在的团队
DROP POLICY IF EXISTS "Users can read their teams" ON public.teams;
CREATE POLICY "Users can read their teams"
ON public.teams FOR SELECT
USING ( id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() ) );

-- INSERT策略：任何认证用户都可以创建团队
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT
WITH CHECK (public.get_user_id() IS NOT NULL);

-- UPDATE策略：只有团队所有者可以更新他们的团队
DROP POLICY IF EXISTS "Team owners can update their teams" ON public.teams;
CREATE POLICY "Team owners can update their teams"
ON public.teams FOR UPDATE
USING ( id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) )
WITH CHECK ( id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

-- DELETE策略：只有团队所有者可以删除他们的团队
DROP POLICY IF EXISTS "Team owners can delete their teams" ON public.teams;
CREATE POLICY "Team owners can delete their teams"
ON public.teams FOR DELETE
USING ( id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

--------------------------------------------------------------------------------
-- public.team_members表的行级安全策略
--------------------------------------------------------------------------------
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
-- SELECT策略：用户可以读取自己的成员资格，所有者可以查看他们团队的所有成员
DROP POLICY IF EXISTS "Users can read team memberships" ON public.team_members;
CREATE POLICY "Users can read team memberships"
ON public.team_members FOR SELECT
USING ( user_id = public.get_user_id() OR team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

-- INSERT策略：只有团队所有者可以添加新成员
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
CREATE POLICY "Team owners can add members"
ON public.team_members FOR INSERT
WITH CHECK ( team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

-- UPDATE策略：用户可以修改自己的角色/状态（例如离开团队），所有者可以修改其他成员的角色
DROP POLICY IF EXISTS "Users can update team memberships" ON public.team_members;
CREATE POLICY "Users can update team memberships"
ON public.team_members FOR UPDATE
USING ( user_id = public.get_user_id() OR team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) )
WITH CHECK ( user_id = public.get_user_id() OR team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

-- DELETE策略：用户可以移除自己，所有者可以移除任何成员
DROP POLICY IF EXISTS "Users can delete team memberships" ON public.team_members;
CREATE POLICY "Users can delete team memberships"
ON public.team_members FOR DELETE
USING ( user_id = public.get_user_id() OR team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

--------------------------------------------------------------------------------
-- public.activity_logs表的行级安全策略
--------------------------------------------------------------------------------
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
-- SELECT策略：用户可以读取自己的活动日志，或者所有者可以读取团队相关的日志
DROP POLICY IF EXISTS "Users can read activity logs" ON public.activity_logs;
CREATE POLICY "Users can read activity logs"
ON public.activity_logs FOR SELECT
USING ( user_id = public.get_user_id() OR team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

--------------------------------------------------------------------------------
-- public.invitations表的行级安全策略
--------------------------------------------------------------------------------
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
-- SELECT策略：用户可以读取邀请：发给他们的、他们发送的，或者他们团队的邀请（如果是所有者）
DROP POLICY IF EXISTS "Users can read invitations" ON public.invitations;
CREATE POLICY "Users can read invitations"
ON public.invitations FOR SELECT
USING ( email = public.get_user_email() OR invited_by = public.get_user_id() OR team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

-- INSERT策略：用户必须是团队所有者和邀请者
DROP POLICY IF EXISTS "Team owners can send invitations" ON public.invitations;
CREATE POLICY "Team owners can send invitations"
ON public.invitations FOR INSERT
WITH CHECK ( invited_by = public.get_user_id() AND team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

-- UPDATE策略：被邀请用户可以接受（更改状态），或者团队所有者可以修改
DROP POLICY IF EXISTS "Users can update invitations" ON public.invitations;
CREATE POLICY "Users can update invitations"
ON public.invitations FOR UPDATE
USING ( email = public.get_user_email() OR team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) )
WITH CHECK ( email = public.get_user_email() OR team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

-- DELETE策略：邀请者或团队所有者可以删除
DROP POLICY IF EXISTS "Users can delete invitations" ON public.invitations;
CREATE POLICY "Users can delete invitations"
ON public.invitations FOR DELETE
USING ( invited_by = public.get_user_id() OR team_id IN ( SELECT team_id FROM public.team_members WHERE user_id = public.get_user_id() AND role = 'owner' ) );

--------------------------------------------------------------------------------
-- public.posts表的行级安全策略
--------------------------------------------------------------------------------
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
-- SELECT策略：所有认证用户可以读取所有帖子（公共树洞）
DROP POLICY IF EXISTS "Authenticated users can read all posts" ON public.posts;
CREATE POLICY "Authenticated users can read all posts"
ON public.posts FOR SELECT
USING (true);

-- INSERT策略：用户可以创建自己的非匿名帖子，或者使用特殊的ANONYMOUS_USER_ID创建匿名帖子
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT
WITH CHECK ( ( public.get_user_id() = author_id AND is_anonymous = false ) OR ( author_id = '00000000-0000-0000-0000-000000000001' AND is_anonymous = true ) );

-- UPDATE策略：只有作者可以更新他们的非匿名帖子
DROP POLICY IF EXISTS "Authors can update their posts" ON public.posts;
CREATE POLICY "Authors can update their posts"
ON public.posts FOR UPDATE
USING ( public.get_user_id() = author_id AND is_anonymous = false )
WITH CHECK ( public.get_user_id() = author_id AND is_anonymous = false );

-- DELETE策略：只有作者可以删除他们的非匿名帖子
DROP POLICY IF EXISTS "Authors can delete their posts" ON public.posts;
CREATE POLICY "Authors can delete their posts"
ON public.posts FOR DELETE
USING ( public.get_user_id() = author_id AND is_anonymous = false );

--------------------------------------------------------------------------------
-- public.likes表的行级安全策略
--------------------------------------------------------------------------------
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
-- SELECT策略：所有认证用户可以读取所有点赞（用于帖子计数等）
DROP POLICY IF EXISTS "Authenticated users can read all likes" ON public.likes;
CREATE POLICY "Authenticated users can read all likes"
ON public.likes FOR SELECT
USING (true);

-- INSERT策略：用户只能添加自己的点赞
DROP POLICY IF EXISTS "Users can add their own likes" ON public.likes;
CREATE POLICY "Users can add their own likes"
ON public.likes FOR INSERT
WITH CHECK (public.get_user_id() = user_id);

-- DELETE策略：用户只能移除自己的点赞
DROP POLICY IF EXISTS "Users can remove their own likes" ON public.likes;
CREATE POLICY "Users can remove their own likes"
ON public.likes FOR DELETE
USING (public.get_user_id() = user_id);

--------------------------------------------------------------------------------
-- public.bookmarks表的行级安全策略
--------------------------------------------------------------------------------
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
-- SELECT策略：用户只能读取自己的书签
DROP POLICY IF EXISTS "Users can read their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can read their own bookmarks"
ON public.bookmarks FOR SELECT
USING (public.get_user_id() = user_id);

-- INSERT策略：用户只能添加自己的书签
DROP POLICY IF EXISTS "Users can add their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can add their own bookmarks"
ON public.bookmarks FOR INSERT
WITH CHECK (public.get_user_id() = user_id);

-- DELETE策略：用户只能移除自己的书签
DROP POLICY IF EXISTS "Users can remove their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can remove their own bookmarks"
ON public.bookmarks FOR DELETE
USING (public.get_user_id() = user_id);