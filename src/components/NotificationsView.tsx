'use client';

/**
 * СПИСОК УВЕДОМЛЕНИЙ
 * ------------------------------------------------------------------
 * Уведомления создаются на сервере в момент действия (лайк, комментарий,
 * подписка) — см. src/lib/queries.ts. Автор не получает уведомление
 * о собственных действиях.
 *
 * Пуш-уведомлений и вебсокетов здесь нет: для учебного проекта это
 * лишняя инфраструктура (см. README, раздел «компромиссы»).
 */

import { useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { useApiResource } from '@/lib/useApiResource';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import type { NotificationDTO } from '@/lib/queries';

/**
 * Формулировки намеренно безличные: в базе не хранится пол пользователя,
 * а «подписался» рядом с женским именем выглядит небрежно.
 */
const TEXT: Record<string, string> = {
  like: 'новый лайк вашего поста',
  comment: 'новый комментарий к вашему посту',
  follow: 'новый подписчик',
};

export function NotificationsView() {
  const { refresh } = useSession();

  const fetcher = useCallback(async () => {
    const data = await api.get<{ notifications: NotificationDTO[] }>('/api/notifications');
    return data.notifications;
  }, []);

  const { data: items, loading, error, reload, setData } = useApiResource(fetcher);

  async function markAllRead() {
    await api.patch('/api/notifications', {});
    setData((previous) => (previous ?? []).map((item) => ({ ...item, isRead: true })));
    await refresh();
  }

  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  if (loading || !items) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Уведомлений пока нет"
        description="Поставьте кому-нибудь лайк или подпишитесь — и увидите, как это работает с другой стороны."
      />
    );
  }

  const unread = items.filter((item) => !item.isRead).length;

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <button
          type="button"
          onClick={markAllRead}
          className="text-sm text-violet-600 hover:underline dark:text-violet-400"
        >
          Пометить все прочитанными ({unread})
        </button>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className={`animate-fade-in flex items-start gap-3 rounded-2xl border p-4 transition ${
              item.isRead
                ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                : 'border-violet-200 bg-violet-50/60 dark:border-violet-900/60 dark:bg-violet-950/20'
            }`}
          >
            <Link href={`/u/${item.actor.username}`}>
              <Avatar displayName={item.actor.displayName} avatarColor={item.actor.avatarColor} />
            </Link>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800 dark:text-slate-200">
                <Link href={`/u/${item.actor.username}`} className="font-semibold hover:underline">
                  {item.actor.displayName}
                </Link>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  · {TEXT[item.type] ?? 'новое событие'}
                </span>
              </p>
              {item.preview && (
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                  «{item.preview}»
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">{timeAgo(item.createdAt)}</p>
            </div>

            {!item.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-500" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
