/**
 * СКЕЛЕТОНЫ ЗАГРУЗКИ  (бонусное требование ТЗ)
 * ------------------------------------------------------------------
 * Показываем «каркас» будущего контента вместо спиннера.
 * Смысл не в красоте: скелетон занимает то же место, что и реальные
 * данные, поэтому страница не прыгает, когда приходит ответ.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-skeleton rounded-md bg-slate-200 dark:bg-slate-700 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Скелетон одной карточки поста — повторяет её реальную структуру. */
export function PostSkeleton() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <div className="mt-5 flex gap-4">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </article>
  );
}

export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Загружаем посты">
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeleton key={index} />
      ))}
      <span className="sr-only">Загружаем посты…</span>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
    </div>
  );
}
