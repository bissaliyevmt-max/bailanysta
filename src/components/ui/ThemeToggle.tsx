'use client';

/**
 * Кнопка переключения светлой и тёмной темы.
 *
 * Обе иконки есть в разметке всегда, а показывается нужная средствами
 * CSS (классы dark:). Благодаря этому компоненту не нужно состояние,
 * и нет момента, когда React ещё «не знает» тему и рисует не ту иконку.
 */

import { useTheme } from '@/components/providers/ThemeProvider';

export function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Переключить светлую и тёмную тему"
      title="Переключить тему"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {/* Солнце — видно в светлой теме */}
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 dark:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          strokeLinecap="round"
          d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
        />
      </svg>

      {/* Луна — видно в тёмной теме */}
      <svg
        viewBox="0 0 24 24"
        className="hidden h-5 w-5 dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z"
        />
      </svg>
    </button>
  );
}
