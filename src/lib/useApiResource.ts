'use client';

/**
 * ХУК ЗАГРУЗКИ ДАННЫХ ИЗ НАШЕГО API
 * ==================================================================
 * Все экраны грузят данные одинаково: показать скелетон → сходить
 * в API → показать данные или ошибку. Этот хук убирает повтор этой
 * логики в пяти компонентах.
 *
 * Что он решает, кроме повтора:
 *
 * 1) ГОНКА ЗАПРОСОВ. Пользователь набирает поиск, уходит на профиль,
 *    возвращается — в воздухе висит несколько запросов, и медленный
 *    может ответить последним, перезаписав свежие данные старыми.
 *    Токен отмены гарантирует, что результат отменённого запроса
 *    будет отброшен.
 *
 * 2) ОБНОВЛЕНИЕ СОСТОЯНИЯ ПОСЛЕ РАЗМОНТИРОВАНИЯ — тот же токен.
 *
 * 3) ЕДИНАЯ ТОЧКА ПЕРЕЧИТЫВАНИЯ. При смене текущего пользователя
 *    меняются лайки, подписки и права на редактирование. Событие
 *    'bailanysta:refresh' заставляет все активные экраны перечитать
 *    данные — раньше этот слушатель дублировался в каждом компоненте.
 *
 * Важно: setState вызывается только ПОСЛЕ await. Синхронный setState
 * внутри эффекта вызывает каскад лишних отрисовок — на это ругается
 * правило react-hooks/set-state-in-effect.
 */

import { useCallback, useEffect, useState } from 'react';

export const REFRESH_EVENT = 'bailanysta:refresh';

/** Сообщить всем экранам, что данные устарели (например, сменился пользователь). */
export function broadcastRefresh() {
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export function useApiResource<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: true,
  });

  /**
   * Загрузка данных. Функция объявлена ВНУТРИ эффекта намеренно:
   * так статический анализатор видит, что setState вызывается только
   * после await, а не синхронно в теле эффекта.
   *
   * keepPrevious: при фоновом обновлении оставляем старые данные
   * на экране, чтобы лента не мигала скелетонами при перечитывании.
   */
  useEffect(() => {
    const token = { cancelled: false };

    const load = async (keepPrevious: boolean) => {
      try {
        const data = await fetcher();
        if (token.cancelled) return;
        setState({ data, error: null, loading: false });
      } catch (error) {
        if (token.cancelled) return;
        const message = error instanceof Error ? error.message : 'Не удалось загрузить данные';
        setState((previous) => ({
          data: keepPrevious ? previous.data : null,
          error: message,
          loading: false,
        }));
      }
    };

    void load(false);

    // Смена текущего пользователя — повод перечитать данные на всех экранах
    const handler = () => void load(true);
    window.addEventListener(REFRESH_EVENT, handler);

    return () => {
      token.cancelled = true;
      window.removeEventListener(REFRESH_EVENT, handler);
    };
  }, [fetcher]);

  /** Повторить запрос вручную — например, по кнопке «Попробовать снова». */
  const reload = useCallback(async () => {
    try {
      const data = await fetcher();
      setState({ data, error: null, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить данные';
      setState((previous) => ({ data: previous.data, error: message, loading: false }));
    }
  }, [fetcher]);

  /** Локально изменить данные, не ходя на сервер (оптимистичные обновления). */
  const setData = useCallback((updater: (previous: T | null) => T | null) => {
    setState((previous) => ({ ...previous, data: updater(previous.data) }));
  }, []);

  return { ...state, reload, setData };
}
