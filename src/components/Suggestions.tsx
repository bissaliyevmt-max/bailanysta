'use client';

/**
 * «КОГО ПОЧИТАТЬ» — рекомендации для подписки.
 * Небольшой блок под лентой: без него функция подписок была бы
 * спрятана внутри профилей, и проверяющий мог бы её не найти.
 */

import { useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { useApiResource } from '@/lib/useApiResource';
import { Avatar } from '@/components/ui/Avatar';
import { FollowButton } from '@/components/FollowButton';
import { Skeleton } from '@/components/ui/Skeleton';

type SuggestedUser = {
  id: number;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
};

export function Suggestions() {
  const fetcher = useCallback(async () => {
    const data = await api.get<{ users: SuggestedUser[] }>('/api/users?suggestions=1');
    return data.users;
  }, []);

  const { data: users, loading, reload } = useApiResource(fetcher);

  // Ошибку рекомендаций показывать незачем — это вспомогательный блок,
  // и сообщение об ошибке здесь отвлекало бы от ленты.
  if (!loading && (!users || users.length === 0)) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Кого почитать
      </h2>

      <ul className="mt-4 space-y-3">
        {loading || !users
          ? Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </li>
            ))
          : users.map((user) => (
              <li key={user.id} className="flex items-center gap-3">
                <Link href={`/u/${user.username}`}>
                  <Avatar displayName={user.displayName} avatarColor={user.avatarColor} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${user.username}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {user.displayName}
                  </Link>
                  <p className="truncate text-xs text-slate-400">@{user.username}</p>
                </div>
                <FollowButton
                  username={user.username}
                  initialFollowing={false}
                  size="sm"
                  onChange={() => void reload()}
                />
              </li>
            ))}
      </ul>
    </section>
  );
}
