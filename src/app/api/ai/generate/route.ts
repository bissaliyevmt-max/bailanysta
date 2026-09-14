/**
 * /api/ai/generate — генерация черновика поста
 * ==================================================================
 * Именно этот эндпоинт закрывает требование ТЗ «все внешние сервисы
 * должны вызываться с серверной части».
 *
 * Браузер отправляет сюда только тему поста. Ключ OpenAI остаётся
 * на сервере: он читается из process.env внутри src/lib/ai.ts,
 * помеченного 'server-only', и никогда не покидает сервер.
 *
 * POST { topic: string } → { content, source, note? }
 */

import { fail, handle, ok, readJson } from '@/lib/http';
import { requireCurrentUser } from '@/lib/session';
import { generatePost } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handle(async () => {
    // Генерация доступна только «залогиненному» пользователю —
    // иначе эндпоинт можно дёргать анонимно и жечь чужие токены.
    await requireCurrentUser();

    const body = await readJson<{ topic?: string }>(request);
    const topic = String(body.topic ?? '').trim();

    if (!topic) return fail('Укажите тему поста');
    if (topic.length > 200) return fail('Тема слишком длинная (максимум 200 символов)');

    return ok(await generatePost(topic));
  });
}
