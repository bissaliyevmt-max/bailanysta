'use client';

/**
 * КОММЕНТАРИИ К ПОСТУ  (бонусное требование ТЗ)
 * ------------------------------------------------------------------
 * Список подгружается лениво — только когда пользователь раскрыл
 * комментарии. Грузить их сразу для всех постов ленты означало бы
 * десятки лишних запросов ради данных, которые обычно никто не смотрит.
 */

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { useApiResource } from '@/lib/useApiResource';
import { timeAgo } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import type { CommentDTO } from '@/lib/queries';

type Props = {
  postId: number;
  onCountChange: (count: number) => void;
};

export function CommentSection({ postId, onCountChange }: Props) {
  const fetcher = useCallback(async () => {
    const data = await api.get<{ comments: CommentDTO[] }>(`/api/posts/${postId}/comments`);
    return data.comments;
  }, [postId]);

  const { data: comments, loading, error, setData } = useApiResource(fetcher);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setSendError(null);

    try {
      const data = await api.post<{ comment: CommentDTO }>(`/api/posts/${postId}/comments`, {
        content,
      });
      setData((previous) => {
        const next = [...(previous ?? []), data.comment];
        onCountChange(next.length);
        return next;
      });
      setDraft('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Не удалось отправить комментарий');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      ) : error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : !comments || comments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Комментариев пока нет. Будьте первым.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar
                displayName={comment.author.displayName}
                avatarColor={comment.author.avatarColor}
                size="sm"
              />
              <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/60">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={`/u/${comment.author.username}`}
                    className="text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                  >
                    {comment.author.displayName}
                  </Link>
                  <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Написать комментарий…"
          maxLength={300}
          className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-violet-900/40"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? '…' : 'Отправить'}
        </button>
      </form>

      {sendError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{sendError}</p>}
    </div>
  );
}
