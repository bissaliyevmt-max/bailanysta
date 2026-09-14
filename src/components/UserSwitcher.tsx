'use client';

/**
 * ПЕРЕКЛЮЧАТЕЛЬ ПОЛЬЗОВАТЕЛЯ
 * ------------------------------------------------------------------
 * Замена полноценной авторизации (в ТЗ её нет — см. README, раздел
 * «компромиссы»). Позволяет за два клика посмотреть на приложение
 * глазами другого человека: подписки, лайки, уведомления и права
 * на редактирование сразу меняются.
 *
 * Для проверяющего это удобнее регистрации: не нужно заводить
 * второй аккаунт, чтобы увидеть, что лайки и подписки работают.
 */

import { useState } from 'react';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Avatar';

export function UserSwitcher() {
  const { me, users, switchUser, createUser } = useSession();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!me) return null;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createUser({ username, displayName });
      setUsername('');
      setDisplayName('');
      setCreating(false);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать пользователя');
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-2.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
      >
        <Avatar displayName={me.displayName} avatarColor={me.avatarColor} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {me.displayName}
          </span>
          <span className="block truncate text-xs text-slate-400">@{me.username}</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8 9 4-4 4 4M8 15l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-full min-w-[16rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="px-3 pt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Войти как
          </p>

          <ul className="max-h-64 overflow-y-auto p-2">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={async () => {
                    await switchUser(user.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    user.id === me.id ? 'bg-slate-50 dark:bg-slate-800/60' : ''
                  }`}
                >
                  <Avatar displayName={user.displayName} avatarColor={user.avatarColor} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-800 dark:text-slate-200">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-xs text-slate-400">@{user.username}</span>
                  </span>
                  {user.id === me.id && <span className="text-xs text-violet-600">✓</span>}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-100 p-2 dark:border-slate-800">
            {creating ? (
              <form onSubmit={handleCreate} className="space-y-2 p-1">
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Имя и фамилия"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="username (латиницей)"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                  >
                    Создать
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full rounded-xl px-2.5 py-2 text-left text-sm text-violet-600 transition hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40"
              >
                + Новый пользователь
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
