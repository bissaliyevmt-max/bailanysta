/**
 * /api/posts/:id/comments
 * GET  — список комментариев поста
 * POST — добавить комментарий { content }
 */

import { handle, ok, readJson } from '@/lib/http';
import { requireCurrentUser } from '@/lib/session';
import { addComment, listComments } from '@/lib/queries';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    return ok({ comments: await listComments(Number(id)) });
  });
}

export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const me = await requireCurrentUser();
    const body = await readJson<{ content?: string }>(request);

    const comment = await addComment({
      postId: Number(id),
      viewerId: me.id,
      content: String(body.content ?? ''),
    });

    return ok({ comment }, 201);
  });
}
