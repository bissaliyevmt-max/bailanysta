/**
 * КОРНЕВОЙ LAYOUT
 * ------------------------------------------------------------------
 * Оборачивает все страницы приложения:
 *   ThemeProvider    — светлая/тёмная тема
 *   SessionProvider  — текущий пользователь
 *   AppShell         — навигация и раскладка
 *
 * Скрипт themeInitScript вставлен в <head> и выполняется ДО отрисовки,
 * иначе при загрузке в тёмной теме мелькал бы белый экран.
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider, themeInitScript } from '@/components/providers/ThemeProvider';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Bailanysta — социальная сеть',
  description:
    'Bailanysta: посты, лента, подписки, комментарии и генерация черновиков через AI. Учебный проект на Next.js.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Синхронный скрипт: выставляет тему до первой отрисовки */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
