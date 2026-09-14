/**
 * ГЛАВНАЯ СТРАНИЦА — ЛЕНТА  (уровень 1 ТЗ)
 * ------------------------------------------------------------------
 * Серверный компонент: читает параметры адреса и решает, какую
 * ленту показать — общую, ленту подписок или результаты поиска.
 * Сами данные грузит клиентский <PostFeed/> через наш API.
 *
 * В Next.js 16 searchParams приходят как Promise — поэтому await.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { PostFeed } from '@/components/PostFeed';
import { SearchBar } from '@/components/SearchBar';
import { Suggestions } from '@/components/Suggestions';

type Props = {
  searchParams: Promise<{ query?: string; tab?: string }>;
};

export default async function FeedPage({ searchParams }: Props) {
  const { query, tab } = await searchParams;
  const followingOnly = tab === 'following';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {query ? `Поиск: ${query}` : followingOnly ? 'Мои подписки' : 'Лента'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {query
            ? 'Посты, в которых встречается запрос или такой хэштег'
            : followingOnly
              ? 'Только те, на кого вы подписаны'
              : 'Всё, что публикуют участники Bailanysta'}
        </p>
      </div>

      {/* useSearchParams требует границы Suspense — иначе Next не сможет
          отрисовать страницу до готовности параметров адреса */}
      <Suspense fallback={<div className="h-11 rounded-full bg-slate-200 dark:bg-slate-800" />}>
        <SearchBar />
      </Suspense>

      {!query && (
        <div className="flex gap-2">
          <Link
            href="/"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              !followingOnly
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-200 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Все
          </Link>
          <Link
            href="/?tab=following"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              followingOnly
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-200 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Подписки
          </Link>
        </div>
      )}

      <PostFeed
        key={`${query ?? ''}-${followingOnly}`}
        query={query}
        followingOnly={followingOnly}
        showComposer={!query && !followingOnly}
        emptyTitle={
          query
            ? 'Ничего не нашлось'
            : followingOnly
              ? 'В ленте подписок пока пусто'
              : 'Постов пока нет'
        }
        emptyDescription={
          query
            ? 'Попробуйте другое слово или хэштег — например, finance или automation.'
            : followingOnly
              ? 'Подпишитесь на кого-нибудь — их посты появятся здесь.'
              : 'Напишите первый пост — форма прямо над этим блоком.'
        }
      />

      {!query && <Suggestions />}
    </div>
  );
}
