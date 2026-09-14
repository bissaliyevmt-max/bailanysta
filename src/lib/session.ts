/**
 * «КТО СЕЙЧАС В ПРИЛОЖЕНИИ»
 * ------------------------------------------------------------------
 * В ТЗ нет требования регистрации и паролей, поэтому полноценную
 * аутентификацию мы сознательно НЕ делаем (см. «компромиссы» в README).
 *
 * Вместо неё — лёгкая сессия: id выбранного пользователя лежит
 * в httpOnly-cookie. Этого достаточно, чтобы всё остальное
 * (лайки, подписки, уведомления, «мой профиль») работало по-настоящему,
 * и при этом мы не храним пароли, которые всё равно некому защищать.
 *
 * httpOnly означает, что JavaScript в браузере не может прочитать cookie —
 * подменить «текущего пользователя» из консоли не получится.
 */

import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import type { User } from '@/db/schema';
import { AppError } from './errors';

export const SESSION_COOKIE = 'bailanysta_uid';

/**
 * Вернуть текущего пользователя.
 * Если cookie нет (первый заход) — берём первого пользователя из базы,
 * чтобы приложение сразу было живым и его можно было потрогать без регистрации.
 */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  const id = raw ? Number(raw) : NaN;

  if (Number.isInteger(id)) {
    const [found] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (found) return found;
  }

  // Запасной вариант: демонстрационный пользователь по умолчанию.
  const [fallback] = await db.select().from(users).orderBy(users.id).limit(1);
  return fallback ?? null;
}

/** Тот же пользователь, но с гарантией — для эндпоинтов, где он обязателен. */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError('В базе нет ни одного пользователя. Запустите: npm run db:seed', 401);
  }
  return user;
}
