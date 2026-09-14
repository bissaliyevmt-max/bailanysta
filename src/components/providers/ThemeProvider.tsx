'use client';

/**
 * ПЕРЕКЛЮЧЕНИЕ СВЕТЛОЙ И ТЁМНОЙ ТЕМЫ  (бонусное требование ТЗ)
 * ==================================================================
 * Выбор сохраняется в localStorage и применяется до первой отрисовки.
 *
 * Ключевое решение: источник правды — класс .dark на <html>, а не
 * состояние React.
 *
 * Почему так. Тему нужно выставить ДО того, как браузер нарисует
 * страницу, иначе пользователь в тёмной теме каждый раз видит вспышку
 * белого. Сделать это может только синхронный скрипт в <head>
 * (themeInitScript ниже) — React к тому моменту ещё не запустился.
 *
 * Если после этого продублировать тему в состоянии React, появляется
 * второй источник правды, который нужно синхронизировать с первым
 * в useEffect — а это лишняя отрисовка и риск рассинхрона. Поэтому
 * состояния нет вовсе: иконки переключаются средствами CSS
 * (классы dark:), а обработчик читает текущую тему прямо из DOM.
 */

import { createContext, useCallback, useContext, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'bailanysta-theme';

const ThemeContext = createContext<{ toggleTheme: () => void }>({ toggleTheme: () => {} });

/**
 * Скрипт, который выполняется синхронно до отрисовки страницы.
 * Это строка, а не функция, потому что его нужно отдать в HTML как есть.
 *
 * Логика: сохранённый выбор пользователя важнее системной настройки,
 * но если выбора ещё не было — уважаем настройку системы.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var theme = stored === 'light' || stored === 'dark' ? stored : system;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();
`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const next: Theme = root.classList.contains('dark') ? 'light' : 'dark';

    root.classList.toggle('dark', next === 'dark');

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Приватный режим браузера может запрещать localStorage.
      // Тема всё равно переключится, просто не переживёт перезагрузку.
    }
  }, []);

  return <ThemeContext.Provider value={{ toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
