/**
 * СТРАНИЦА УВЕДОМЛЕНИЙ  (бонусное требование ТЗ)
 */

import type { Metadata } from 'next';
import { NotificationsView } from '@/components/NotificationsView';

export const metadata: Metadata = { title: 'Уведомления — Bailanysta' };

export default function NotificationsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Уведомления</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Лайки, комментарии и новые подписчики
        </p>
      </div>
      <NotificationsView />
    </div>
  );
}
