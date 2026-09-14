'use client';

/**
 * ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
 * ------------------------------------------------------------------
 * Шапка со статистикой + лента его постов.
 * На своей странице доступны форма создания поста и редактирование
 * профиля; на чужой — кнопка подписки.
 */

import { useCallback, useState } from 'react';
import { api } from '@/lib/client';
import { useApiResource } from '@/lib/useApiResource';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Avatar';
import { FollowButton } from '@/components/FollowButton';
import { PostFeed } from '@/components/PostFeed';
import { ProfileSkeleton, PostListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import type { ProfileDTO } from '@/lib/queries';

export function ProfileView({ username }: { username: string }) {
  const { refresh } = useSession();

  const fetcher = useCallback(async () => {
    const data = await api.get<{ profile: ProfileDTO }>(`/api/users/${username}`);
    return data.profile;
  }, [username]);

  const { data: profile, loading, error, reload, setData } = useApiResource(fetcher);

  // Форма редактирования открывается пустой и заполняется из профиля
  // в момент нажатия «Редактировать» — держать её значения в отдельном
  // состоянии с самого начала незачем.
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEditing() {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setSaveError(null);
    setEditing(true);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api.patch('/api/me', { displayName, bio });
      await reload();
      await refresh();
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  }

  if (error && !profile) {
    return <ErrorState message={error} onRetry={() => void reload()} />;
  }

  if (loading || !profile) {
    return (
      <div className="space-y-5">
        <ProfileSkeleton />
        <PostListSkeleton count={2} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar displayName={profile.displayName} avatarColor={profile.avatarColor} size="lg" />

          <div className="min-w-0 flex-1">
            {editing ? (
              <form onSubmit={saveProfile} className="space-y-2">
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={64}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800"
                />
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="Пара слов о себе"
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800"
                />
                {saveError && (
                  <p className="text-sm text-rose-600 dark:text-rose-400">{saveError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {saving ? 'Сохраняю…' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-full px-4 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight">{profile.displayName}</h1>
                <p className="text-sm text-slate-400">@{profile.username}</p>
                {profile.bio && (
                  <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-300">{profile.bio}</p>
                )}
              </>
            )}

            <dl className="mt-4 flex flex-wrap gap-6 text-sm">
              <div>
                <dt className="inline font-semibold">{profile.postCount}</dt>{' '}
                <dd className="inline text-slate-500 dark:text-slate-400">постов</dd>
              </div>
              <div>
                <dt className="inline font-semibold">{profile.followerCount}</dt>{' '}
                <dd className="inline text-slate-500 dark:text-slate-400">подписчиков</dd>
              </div>
              <div>
                <dt className="inline font-semibold">{profile.followingCount}</dt>{' '}
                <dd className="inline text-slate-500 dark:text-slate-400">подписок</dd>
              </div>
            </dl>
          </div>

          <div className="shrink-0">
            {profile.isViewer ? (
              !editing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Редактировать
                </button>
              )
            ) : (
              <FollowButton
                username={profile.username}
                initialFollowing={profile.followedByViewer}
                onChange={(following, followerCount) =>
                  setData((previous) =>
                    previous ? { ...previous, followedByViewer: following, followerCount } : previous,
                  )
                }
              />
            )}
          </div>
        </div>
      </header>

      <PostFeed
        authorUsername={profile.username}
        showComposer={profile.isViewer}
        emptyTitle={profile.isViewer ? 'У вас пока нет постов' : 'Пользователь ещё ничего не написал'}
        emptyDescription={
          profile.isViewer ? 'Напишите первый — форма прямо над этим блоком.' : undefined
        }
      />
    </div>
  );
}
