'use client';

/**
 * ГЛОБАЛЬНОЕ СОСТОЯНИЕ «КТО СЕЙЧАС В ПРИЛОЖЕНИИ»
 * ------------------------------------------------------------------
 * Текущий пользователь, список всех пользователей (для переключателя)
 * и счётчик непрочитанных уведомлений нужны сразу в нескольких местах:
 * в шапке, в форме создания поста, в кнопках лайка и подписки.
 *
 * Поэтому они живут в одном React-контексте, а не прокидываются
 * пропсами через пять уровней компонентов.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/client';
import { broadcastRefresh } from '@/lib/useApiResource';

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  bio?: string;
  avatarColor: string;
};

type MeResponse = {
  me: SessionUser | null;
  users: SessionUser[];
  unreadNotifications: number;
};

type SessionContextValue = MeResponse & {
  loading: boolean;
  /** Перечитать данные с сервера (после смены пользователя, лайка и т.п.) */
  refresh: () => Promise<void>;
  switchUser: (userId: number) => Promise<void>;
  createUser: (data: { username: string; displayName: string; bio?: string }) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  me: null,
  users: [],
  unreadNotifications: 0,
  loading: true,
  refresh: async () => {},
  switchUser: async () => {},
  createUser: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MeResponse>({
    me: null,
    users: [],
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<MeResponse>('/api/me');
      setState(data);
      setLoading(false);
    } catch (error) {
      console.error('Не удалось загрузить текущего пользователя', error);
      setLoading(false);
    }
  }, []);

  // Первая загрузка. Асинхронная функция объявлена прямо внутри эффекта,
  // а setState вызывается только после await — синхронный setState в теле
  // эффекта вызвал бы каскад лишних отрисовок.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await api.get<MeResponse>('/api/me');
        if (cancelled) return;
        setState(data);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error('Не удалось загрузить текущего пользователя', error);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const switchUser = useCallback(
    async (userId: number) => {
      await api.put('/api/me', { userId });
      await refresh();
      // Сменился пользователь — значит поменялись лайки, подписки
      // и права на редактирование. Просим все открытые экраны
      // перечитать свои данные.
      broadcastRefresh();
    },
    [refresh],
  );

  const createUser = useCallback(
    async (data: { username: string; displayName: string; bio?: string }) => {
      await api.post('/api/me', data);
      await refresh();
      broadcastRefresh();
    },
    [refresh],
  );

  return (
    <SessionContext.Provider value={{ ...state, loading, refresh, switchUser, createUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
