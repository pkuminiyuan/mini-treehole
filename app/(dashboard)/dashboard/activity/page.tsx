import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Settings,
  LogOut,
  UserPlus,
  Lock,
  UserCog,
  AlertCircle,
  UserMinus,
  Mail,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { ActivityType } from '@/lib/db/schema';
import { getActivityLogs } from '@/lib/db/queries';

const iconMap: Record<ActivityType, LucideIcon> = {
  [ActivityType.SIGN_UP]: UserPlus,
  [ActivityType.SIGN_IN]: UserCog,
  [ActivityType.SIGN_OUT]: LogOut,
  [ActivityType.UPDATE_PASSWORD]: Lock,
  [ActivityType.DELETE_ACCOUNT]: UserMinus,
  [ActivityType.UPDATE_ACCOUNT]: Settings,
  [ActivityType.CREATE_TEAM]: UserPlus,
  [ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
  [ActivityType.INVITE_TEAM_MEMBER]: Mail,
  [ActivityType.ACCEPT_INVITATION]: CheckCircle,
};

function getRelativeTime(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return '刚刚';
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} 分钟前`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} 小时前`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} 天前`;
  return date.toLocaleDateString();
}

function formatAction(action: ActivityType): string {
  switch (action) {
    case ActivityType.SIGN_UP:
      return '你注册了';
    case ActivityType.SIGN_IN:
      return '你登录了';
    case ActivityType.SIGN_OUT:
      return '你退出了';
    case ActivityType.UPDATE_PASSWORD:
      return '修改了你的密码';
    case ActivityType.DELETE_ACCOUNT:
      return '删除账号';
    case ActivityType.UPDATE_ACCOUNT:
      return '更新账号';
    case ActivityType.CREATE_TEAM:
      return '创建了一个新的团队';
    case ActivityType.REMOVE_TEAM_MEMBER:
      return '你踢出了一位团队成员';
    case ActivityType.INVITE_TEAM_MEMBER:
      return '你邀请了一位团队成员';
    case ActivityType.ACCEPT_INVITATION:
      return '你接受了邀请';
    default:
      return '一种未知而神秘的行为';
  }
}

export default async function ActivityPage() {
  const logs = await getActivityLogs();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-foreground mb-6">
        活动日志
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>最近记录</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log) => {
                const Icon = iconMap[log.action as ActivityType] || Settings;
                const formattedAction = formatAction(
                  log.action as ActivityType
                );

                return (
                  <li key={log.id} className="flex items-center space-x-4">
                    <div className="bg-brand-muted-primary rounded-full p-2">
                      <Icon className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {formattedAction}
                        {log.ipAddress && ` from IP ${log.ipAddress}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getRelativeTime(new Date(log.timestamp))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <AlertCircle className="h-12 w-12 text-brand-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                暂无
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                你的所有操作（比如登录或退出），都会被记录在这里。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
