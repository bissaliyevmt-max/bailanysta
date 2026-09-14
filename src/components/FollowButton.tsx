'use client';

/** Кнопка подписки/отписки. Оптимистичное обновление, как и у лайка. */

import { useState } from 'react';
import { api } from '@/lib/client';

type Props = {
  username: string;
  initialFollowing: boolean;
  onChange?: (following: boolean, followerCount: number) => void;
  size?: 'sm' | 'md';
};

export function FollowButton({ username, initialFollowing, onChange, size = 'md' }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const previous = following;
    setFollowing(!previous);

    try {
      const result = await api.post<{ following: boolean; followerCount: number }>(
        `/api/users/${username}/follow`,
      );
      setFollowing(result.following);
      onChange?.(result.following, result.followerCount);
    } catch {
      setFollowing(previous);
    } finally {
      setBusy(false);
    }
  }

  const padding = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2 text-sm';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`rounded-full font-medium transition disabled:opacity-60 ${padding} ${
        following
          ? 'border border-slate-300 text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
          : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
      }`}
    >
      {following ? 'Вы подписаны' : 'Подписаться'}
    </button>
  );
}
