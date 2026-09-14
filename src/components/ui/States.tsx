/**
 * Пустые состояния и ошибки.
 * Пустой экран без объяснения выглядит как поломка, поэтому у каждого
 * списка есть внятное сообщение и, где уместно, действие.
 */

import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-base font-medium text-slate-800 dark:text-slate-100">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center dark:border-rose-900/60 dark:bg-rose-950/40"
    >
      <p className="text-sm font-medium text-rose-700 dark:text-rose-300">Что-то пошло не так</p>
      <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full border border-rose-300 px-4 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/40"
        >
          Попробовать снова
        </button>
      )}
    </div>
  );
}
