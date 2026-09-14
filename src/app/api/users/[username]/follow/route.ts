/**
 * /api/users/:username/follow — подписаться или отписаться (переключатель)
 */

import { handle, ok } from '@/lib/http';
import { requireCurrentUser } from '@/lib/session';
import { toggleFollow } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  return handle(async () => {
    const { username } = await params;
    const me = await requireCurrentUser();
    return ok(await toggleFollow({ targetUsername: username, viewerId: me.id }));
  });
}
