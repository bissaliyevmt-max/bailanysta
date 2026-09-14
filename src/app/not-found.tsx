/** Страница 404 — чтобы неверный адрес не показывал системную заглушку. */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl font-bold text-slate-300 dark:text-slate-700">404</p>
      <h1 className="mt-4 text-xl font-semibold">Такой страницы нет</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Возможно, пост удалили или в адресе опечатка.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
      >
        Вернуться в ленту
      </Link>
    </div>
  );
}
