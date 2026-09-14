'use client';

/**
 * КАРКАС ПРИЛОЖЕНИЯ: НАВИГАЦИЯ И РАСКЛАДКА
 * ------------------------------------------------------------------
 * Три колонки на десктопе (навигация — контент — рекомендации),
 * одна колонка и нижняя панель на телефоне.
 *
 * Компонент общий для всех страниц: он лежит в layout.tsx, поэтому
 * при переходах меняется только центральная колонка, а не вся страница.
 * Это и есть роутинг из уровня 2 ТЗ — навигация без перезагрузки.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSession } from '@/components/providers/SessionProvider';
import { UserSwitcher } from '@/components/UserSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me, unreadNotifications } = useSession();

  const items: NavItem[] = [
    {
      href: '/',
      label: 'Лента',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 10 12 4l8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9Z" />
        </svg>
      ),
    },
    {
      href: '/notifications',
      label: 'Уведомления',
      badge: unreadNotifications,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M13.7 20a2 2 0 0 1-3.4 0" />
        </svg>
      ),
    },
    {
      href: me ? `/u/${me.username}` : '/',
      label: 'Мой профиль',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8.5" r="3.5" />
          <path strokeLinecap="round" d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
        </svg>
      ),
    },
  ];

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Шапка на телефоне */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Bailanysta
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 pb-24 md:pb-10">
        {/* Левая колонка: навигация (только десктоп) */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col py-6 md:flex">
          <Link href="/" className="px-3 text-2xl font-bold tracking-tight">
            Bailanysta
          </Link>
          <p className="mt-1 px-3 text-xs text-slate-400">Байланыс — это связь</p>

          <nav className="mt-8 flex-1 space-y-1">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${
                  isActive(item.href)
                    ? 'bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="space-y-3">
            <ThemeToggle />
            <UserSwitcher />
          </div>
        </aside>

        {/* Центральная колонка: контент страницы */}
        <main className="min-w-0 flex-1 py-6">{children}</main>
      </div>

      {/* Нижняя панель на телефоне */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
              isActive(item.href)
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {item.icon}
            {item.label}
            {item.badge ? (
              <span className="absolute right-1/2 top-1.5 translate-x-4 rounded-full bg-violet-600 px-1.5 text-[10px] font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
