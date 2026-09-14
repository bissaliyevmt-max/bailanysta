/**
 * /api/users — список пользователей и рекомендации «кого почитать»
 * GET /api/users?suggestions=1
 */

import { handle, ok } from '@/lib/http';
import { getCurrentUser } from '@/lib/session';
import { listSuggestions, listUsers } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('suggestions') === '1') {
      const me = await getCurrentUser();
      return ok({ users: await listSuggestions(me?.id ?? null) });
    }

    return ok({ users: await listUsers() });
  });
}
