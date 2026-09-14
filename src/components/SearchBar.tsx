'use client';

/**
 * ПОИСК ПО ПОСТАМ И ХЭШТЕГАМ  (бонусное требование ТЗ)
 * ------------------------------------------------------------------
 * Запрос живёт в адресе страницы (?query=...), а не в состоянии
 * компонента. Благодаря этому результатом поиска можно поделиться
 * ссылкой, он переживает обновление страницы и корректно работает
 * с кнопкой «назад».
 *
 * Поле сделано неуправляемым (defaultValue + key), а не управляемым
 * через useState. Причина: адрес может измениться извне — например,
 * при клике по хэштегу внутри поста. Управляемому полю пришлось бы
 * догонять адрес через useEffect, а здесь смена key просто пересоздаёт
 * поле с новым значением. Меньше кода и нет рассинхрона.
 */

import { useRouter, useSearchParams } from 'next/navigation';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('query') ?? '';

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('query');
    const trimmed = String(value ?? '').trim();
    router.push(trimmed ? `/?query=${encodeURIComponent(trimmed)}` : '/');
  }

  return (
    <form onSubmit={submit} className="relative">
      <label htmlFor="search" className="sr-only">
        Поиск по постам и хэштегам
      </label>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="search"
        name="query"
        key={current}
        defaultValue={current}
        placeholder="Поиск по постам и хэштегам"
        className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-900/40"
      />
      {current && (
        <button
          type="button"
          onClick={() => router.push('/')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          сбросить
        </button>
      )}
    </form>
  );
}
