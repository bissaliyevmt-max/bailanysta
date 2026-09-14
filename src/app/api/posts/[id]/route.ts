/**
 * /api/posts/:id — один пост
 * GET    — получить
 * PATCH  — отредактировать (только автор)
 * DELETE — удалить (только автор)
 *
 * В Next.js 16 параметры динамического маршрута приходят как Promise,
 * поэтому их нужно await'ить.
 */

import { fail, handle, ok, readJson } from '@/lib/http';
import { getCurrentUser, requireCurrentUser } from '@/lib/session';
import { deletePost, getPost, updatePost } from '@/lib/queries';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const me = await getCurrentUser();
    const post = await getPost(Number(id), me?.id ?? null);
    if (!post) return fail('Пост не найден', 404);
    return ok({ post });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const me = await requireCurrentUser();
    const body = await readJson<{ content?: string }>(request);

    const post = await updatePost({
      postId: Number(id),
      viewerId: me.id,
      content: String(body.content ?? ''),
    });

    return ok({ post });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const me = await requireCurrentUser();
    await deletePost({ postId: Number(id), viewerId: me.id });
    return ok({ ok: true });
  });
}
