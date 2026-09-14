/**
 * /api/notifications
 * GET   — список уведомлений текущего пользователя
 * PATCH — пометить прочитанными ({ ids: number[] } или все, если ids не передан)
 */

import { handle, ok, readJson } from '@/lib/http';
import { requireCurrentUser } from '@/lib/session';
import { countUnreadNotifications, listNotifications, markNotificationsRead } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const me = await requireCurrentUser();
    return ok({
      notifications: await listNotifications(me.id),
      unread: await countUnreadNotifications(me.id),
    });
  });
}

export async function PATCH(request: Request) {
  return handle(async () => {
    const me = await requireCurrentUser();
    const body = await readJson<{ ids?: number[] }>(request);
    await markNotificationsRead(me.id, Array.isArray(body.ids) ? body.ids : undefined);
    return ok({ ok: true, unread: await countUnreadNotifications(me.id) });
  });
}
