'use client';

/**
 * ФОРМА СОЗДАНИЯ ПОСТА
 * ------------------------------------------------------------------
 * Здесь же живёт бонусная функция — генерация черновика через AI.
 *
 * Ключевой момент по ТЗ: компонент НЕ ходит в OpenAI напрямую.
 * Он отправляет тему на наш эндпоинт /api/ai/generate, и уже сервер
 * обращается к внешнему сервису. Ключ остаётся на сервере.
 */

import { useState } from 'react';
import { api } from '@/lib/client';
import { useSession } from '@/components/providers/SessionProvider';
import { Avatar } from '@/components/ui/Avatar';
import type { PostDTO } from '@/lib/queries';

const MAX_LENGTH = 500;

export function PostComposer({ onCreated }: { onCreated: (post: PostDTO) => void }) {
  const { me } = useSession();

  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  // Запоминаем, что текст пришёл из генератора — пост будет помечен значком AI
  const [aiGenerated, setAiGenerated] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_LENGTH - content.length;

  async function generate() {
    if (!topic.trim() || generating) return;

    setGenerating(true);
    setError(null);
    setAiNote(null);

    try {
      const result = await api.post<{ content: string; source: string; note?: string }>(
        '/api/ai/generate',
        { topic },
      );
      setContent(result.content.slice(0, MAX_LENGTH));
      setAiGenerated(true);
      setAiNote(
        result.note ??
          (result.source === 'openai'
            ? 'Черновик сгенерирован моделью. Отредактируйте под себя.'
            : null),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сгенерировать текст');
    } finally {
      setGenerating(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      const data = await api.post<{ post: PostDTO }>('/api/posts', { content, aiGenerated });
      onCreated(data.post);
      setContent('');
      setTopic('');
      setAiGenerated(false);
      setAiNote(null);
      setShowAiPanel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось опубликовать пост');
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex gap-3">
        {me && <Avatar displayName={me.displayName} avatarColor={me.avatarColor} />}

        <div className="min-w-0 flex-1">
          <label htmlFor="post-content" className="sr-only">
            Текст поста
          </label>
          <textarea
            id="post-content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              // Правил руками — значит это уже не «чистая» генерация,
              // но пометку оставляем: черновик всё равно был от AI.
            }}
            rows={3}
            maxLength={MAX_LENGTH}
            placeholder="Что нового? Хэштеги пишите через # — по ним работает поиск."
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-slate-400 dark:text-slate-100"
          />

          {showAiPanel && (
            <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900/60 dark:bg-violet-950/30">
              <label htmlFor="ai-topic" className="text-xs font-medium text-violet-800 dark:text-violet-300">
                О чём написать?
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="ai-topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="например: автоматизация казначейской отчётности"
                  maxLength={200}
                  className="min-w-0 flex-1 rounded-full border border-violet-200 bg-white px-3.5 py-1.5 text-sm outline-none focus:border-violet-400 dark:border-violet-900 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={generate}
                  disabled={!topic.trim() || generating}
                  className="shrink-0 rounded-full bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-40"
                >
                  {generating ? 'Пишу…' : 'Сгенерировать'}
                </button>
              </div>
              {aiNote && (
                <p className="mt-2 text-xs text-violet-700 dark:text-violet-300">{aiNote}</p>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiPanel((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                showAiPanel
                  ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
                <path strokeLinecap="round" d="M18 16.5 18.8 18l1.7.8-1.7.7-.8 1.5-.7-1.5-1.8-.7 1.8-.8.7-1.5Z" />
              </svg>
              Помощь AI
            </button>

            <span
              className={`ml-auto text-xs ${
                remaining < 40 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
              }`}
            >
              {remaining}
            </span>

            <button
              type="submit"
              disabled={!content.trim() || sending}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {sending ? 'Публикую…' : 'Опубликовать'}
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      </div>
    </form>
  );
}
