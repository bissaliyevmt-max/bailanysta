/**
 * /api/me — текущий пользователь
 * ------------------------------------------------------------------
 * GET    — кто сейчас в приложении + список всех пользователей
 *          (для переключателя) + число непрочитанных уведомлений
 * PUT    — переключиться на другого пользователя (кладём id в cookie)
 * POST   — создать нового пользователя и сразу войти под ним
 * PATCH  — отредактировать свой профиль (имя, описание)
 */

import { NextResponse } from 'next/server';
import { fail, handle, ok, readJson } from '@/lib/http';
import { SESSION_COOKIE, getCurrentUser, requireCurrentUser } from '@/lib/session';
import { countUnreadNotifications, createUser, listUsers, updateProfile } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const me = await getCurrentUser();
    const all = await listUsers();
    const unread = me ? await countUnreadNotifications(me.id) : 0;
    return ok({ me, users: all, unreadNotifications: unread });
  });
}

export async function PUT(request: Request) {
  return handle(async () => {
    const body = await readJson<{ userId?: number }>(request);
    const userId = Number(body.userId);

    if (!Number.isInteger(userId)) return fail('Не передан корректный userId');

    const all = await listUsers();
    if (!all.some((u) => u.id === userId)) return fail('Пользователь не найден', 404);

    const response = NextResponse.json({ ok: true, userId });
    // httpOnly — cookie недоступна из JavaScript в браузере.
    // sameSite: 'lax' — защита от подделки межсайтовых запросов.
    response.cookies.set(SESSION_COOKIE, String(userId), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson<{ username?: string; displayName?: string; bio?: string }>(request);

    const created = await createUser({
      username: String(body.username ?? ''),
      displayName: String(body.displayName ?? ''),
      bio: body.bio,
    });

    const response = NextResponse.json({ user: created }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, String(created.id), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  });
}

export async function PATCH(request: Request) {
  return handle(async () => {
    const me = await requireCurrentUser();
    const body = await readJson<{ displayName?: string; bio?: string }>(request);
    const updated = await updateProfile({
      viewerId: me.id,
      displayName: body.displayName,
      bio: body.bio,
    });
    return ok({ user: updated });
  });
}
