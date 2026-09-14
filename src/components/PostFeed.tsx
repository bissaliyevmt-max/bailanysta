'use client';

/**
 * ЛЕНТА ПОСТОВ
 * ------------------------------------------------------------------
 * Один переиспользуемый компонент на три случая:
 *   • главная лента            <PostFeed />
 *   • лента подписок           <PostFeed followingOnly />
 *   • посты одного автора      <PostFeed authorUsername="manas" />
 *
 * Загрузку, ошибки и перечитывание берёт на себя useApiResource.
 * Здесь остаётся только то, что специфично для ленты: как строится
 * адрес запроса и что делать при создании, изменении и удалении поста.
 */

import { useCallback } from 'react';
import { api } from '@/lib/client';
import { useApiResource } from '@/lib/useApiResource';
import { PostCard } from '@/components/PostCard';
import { PostComposer } from '@/components/PostComposer';
import { PostListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import type { PostDTO } from '@/lib/queries';

type Props = {
  authorUsername?: string;
  query?: string;
  followingOnly?: boolean;
  showComposer?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function PostFeed({
  authorUsername,
  query,
  followingOnly,
  showComposer = false,
  emptyTitle = 'Здесь пока пусто',
  emptyDescription,
}: Props) {
  // useCallback обязателен: без него на каждой отрисовке создавалась бы
  // новая функция, хук считал бы это изменением и грузил ленту бесконечно.
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    if (authorUsername) params.set('author', authorUsername);
    if (query) params.set('query', query);
    if (followingOnly) params.set('following', '1');

    const data = await api.get<{ posts: PostDTO[] }>(`/api/posts?${params.toString()}`);
    return data.posts;
  }, [authorUsername, query, followingOnly]);

  const { data: posts, loading, error, reload, setData } = useApiResource(fetcher);

  const handleChanged = (updated: PostDTO) =>
    setData((previous) =>
      (previous ?? []).map((post) => (post.id === updated.id ? updated : post)),
    );

  const handleDeleted = (postId: number) =>
    setData((previous) => (previous ?? []).filter((post) => post.id !== postId));

  // Новый пост показываем сразу сверху, без повторного запроса всей ленты
  const handleCreated = (post: PostDTO) => setData((previous) => [post, ...(previous ?? [])]);

  return (
    <div className="space-y-4">
      {showComposer && <PostComposer onCreated={handleCreated} />}

      {loading ? (
        <PostListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : !posts || posts.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onChanged={handleChanged} onDeleted={handleDeleted} />
        ))
      )}
    </div>
  );
}
