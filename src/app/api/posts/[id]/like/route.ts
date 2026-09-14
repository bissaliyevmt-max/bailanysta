/**
 * /api/posts/:id/like — поставить или снять лайк (переключатель)
 *
 * Один эндпоинт вместо пары POST/DELETE: на стороне сервера мы всё равно
 * смотрим, есть ли уже лайк, так что отдельный DELETE ничего не упрощает.
 */

import { handle, ok } from '@/lib/http';
import { requireCurrentUser } from '@/lib/session';
import { toggleLike } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const me = await requireCurrentUser();
    const result = await toggleLike({ postId: Number(id), viewerId: me.id });
    return ok(result);
  });
}
