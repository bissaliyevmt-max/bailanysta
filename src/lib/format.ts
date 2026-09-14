/**
 * ФОРМАТИРОВАНИЕ ДАТ И ИМЁН
 * ------------------------------------------------------------------
 * «5 минут назад» вместо «2026-09-14T09:30:00.000Z».
 * Функции чистые и без зависимостей — намеренно не тянем date-fns
 * ради двух маленьких функций (см. раздел «компромиссы» в README).
 */

/** Русские окончания: 1 минуту, 2 минуты, 5 минут. */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return 'только что';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;

  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Инициалы для аватара-заглушки: «Манас Бисалиев» → «МБ». */
export function initials(displayName: string): string {
  return displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Классы Tailwind для цветного аватара. Ключи совпадают с users.avatar_color. */
export const AVATAR_COLORS: Record<string, string> = {
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
  indigo: 'bg-indigo-500',
};

export function avatarClass(color: string): string {
  return AVATAR_COLORS[color] ?? AVATAR_COLORS.violet;
}
