'use client';

/**
 * КАРТОЧКА ПОСТА
 * ------------------------------------------------------------------
 * Отвечает за: показ поста, лайк, раскрытие комментариев,
 * редактирование и удаление собственного поста.
 *
 * Лайк реализован «оптимистично»: интерфейс обновляется мгновенно,
 * не дожидаясь ответа сервера, а если запрос упал — состояние
 * откатывается назад. Без этого каждый лайк ощущался бы как задержка
 * в полсекунды, и интерфейс казался бы медленным.
 */

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { timeAgo } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { PostContent } from '@/components/PostContent';
import { CommentSection } from '@/components/CommentSection';
import type { PostDTO } from '@/lib/queries';

type Props = {
  post: PostDTO;
  onChanged: (post: PostDTO) => void;
  onDeleted: (postId: number) => void;
};

export function PostCard({ post, onChanged, onDeleted }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleLike() {
    // 1. Сразу показываем новое состояние
    const optimistic: PostDTO = {
      ...post,
      likedByViewer: !post.likedByViewer,
      likeCount: post.likeCount + (post.likedByViewer ? -1 : 1),
    };
    onChanged(optimistic);

    try {
      // 2. Отправляем запрос и подставляем настоящие числа с сервера
      const result = await api.post<{ liked: boolean; likeCount: number }>(
        `/api/posts/${post.id}/like`,
      );
      onChanged({ ...post, likedByViewer: result.liked, likeCount: result.likeCount });
    } catch (err) {
      // 3. Не получилось — возвращаем как было
      onChanged(post);
      setError(err instanceof Error ? err.message : 'Не удалось поставить лайк');
    }
  }

  async function saveEdit() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const data = await api.patch<{ post: PostDTO }>(`/api/posts/${post.id}`, { content: draft });
      onChanged(data.post);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить изменения');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      await api.delete(`/api/posts/${post.id}`);
      onDeleted(post.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить пост');
      setBusy(false);
    }
  }

  return (
    <article className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <header className="flex items-start gap-3">
        <Link href={`/u/${post.author.username}`}>
          <Avatar displayName={post.author.displayName} avatarColor={post.author.avatarColor} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link
              href={`/u/${post.author.username}`}
              className="truncate font-semibold text-slate-900 hover:underline dark:text-slate-100"
            >
              {post.author.displayName}
            </Link>
            <span className="truncate text-sm text-slate-400">@{post.author.username}</span>
          </div>
          <p className="text-xs text-slate-400">
            {timeAgo(post.createdAt)}
            {post.updatedAt !== post.createdAt && ' · изменён'}
          </p>
        </div>

        {/* Значок AI-поста: честно помечаем сгенерированный текст */}
        {post.aiGenerated && (
          <span
            title="Черновик этого поста сгенерирован через AI"
            className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
          >
            AI
          </span>
        )}

      </header>

      <div className="mt-3.5">
        {editing ? (
          <div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[15px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-violet-900/40"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={busy || !draft.trim()}
                className="rounded-full bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-40"
              >
                {busy ? 'Сохраняю…' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full px-4 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Отмена
              </button>
              <span className="ml-auto text-xs text-slate-400">{draft.length}/500</span>
            </div>
          </div>
        ) : (
          <PostContent content={post.content} />
        )}
      </div>

      <footer className="mt-4 flex items-center gap-1">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={post.likedByViewer}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
            post.likedByViewer
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4.5 w-4.5"
            fill={post.likedByViewer ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5c0 5.15-7 9.5-7 9.5Z"
            />
          </svg>
          {post.likeCount}
        </button>

        <button
          type="button"
          onClick={() => setShowComments((value) => !value)}
          aria-expanded={showComments}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.5A8 8 0 1 1 21 12Z"
            />
          </svg>
          {post.commentCount}
        </button>

        {/* Действия автора: только у своих постов. В подвале, а не в шапке —
            иначе на узком экране они вытесняли имя автора в многоточие. */}
        {post.ownedByViewer && !editing && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => {
                setDraft(post.content);
                setEditing(true);
              }}
              className="rounded-full px-3 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              Изменить
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded-full px-3 py-1.5 text-xs text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              Удалить
            </button>
          </div>
        )}
      </footer>

      {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {showComments && (
        <CommentSection
          postId={post.id}
          onCountChange={(count) => onChanged({ ...post, commentCount: count })}
        />
      )}
    </article>
  );
}
