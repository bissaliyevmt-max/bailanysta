/**
 * /api/users/:username — публичный профиль пользователя
 * Отдаёт счётчики постов, подписчиков и подписок, а также признак,
 * подписан ли на него текущий пользователь.
 */

import { fail, handle, ok } from '@/lib/http';
import { getCurrentUser } from '@/lib/session';
import { getProfile } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  return handle(async () => {
    const { username } = await params;
    const me = await getCurrentUser();
    const profile = await getProfile(username, me?.id ?? null);
    if (!profile) return fail('Пользователь не найден', 404);
    return ok({ profile });
  });
}
