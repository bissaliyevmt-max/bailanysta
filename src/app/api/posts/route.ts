/**
 * /api/posts — лента и создание постов
 * ------------------------------------------------------------------
 * GET  /api/posts?query=...&author=...&following=1&limit=20&offset=0
 * POST /api/posts  { content, aiGenerated? }
 */

import { handle, ok, readJson } from '@/lib/http';
import { getCurrentUser, requireCurrentUser } from '@/lib/session';
import { createPost, listPosts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const me = await getCurrentUser();
    const { searchParams } = new URL(request.url);

    const posts = await listPosts({
      viewerId: me?.id ?? null,
      authorUsername: searchParams.get('author') ?? undefined,
      query: searchParams.get('query') ?? undefined,
      followingOnly: searchParams.get('following') === '1',
      limit: Number(searchParams.get('limit') ?? 20),
      offset: Number(searchParams.get('offset') ?? 0),
    });

    return ok({ posts });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireCurrentUser();
    const body = await readJson<{ content?: string; aiGenerated?: boolean }>(request);

    const post = await createPost({
      authorId: me.id,
      content: String(body.content ?? ''),
      aiGenerated: Boolean(body.aiGenerated),
    });

    return ok({ post }, 201);
  });
}
