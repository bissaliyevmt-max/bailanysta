/**
 * ГЕНЕРАЦИЯ ТЕКСТА ПОСТА ЧЕРЕЗ AI
 * ==================================================================
 * ВАЖНО ПО ТЗ: «Все внешние сервисы должны быть вызваны с серверной
 * части приложения». Этот файл помечен 'server-only' — если кто-то
 * случайно импортирует его в клиентский компонент, сборка упадёт
 * с ошибкой. Это не комментарий-пожелание, а проверка на этапе сборки.
 *
 * Ключ OPENAI_API_KEY живёт в переменных окружения без префикса
 * NEXT_PUBLIC_, поэтому он физически не попадает в JS-бандл браузера.
 * Браузер вызывает только наш собственный эндпоинт /api/ai/generate,
 * и уже сервер ходит в OpenAI.
 *
 *   Браузер → POST /api/ai/generate → (сервер) → api.openai.com
 *
 * ОТКАЗОУСТОЙЧИВОСТЬ: если ключ не задан или OpenAI недоступен,
 * работает встроенный офлайн-генератор. Приложение никогда не падает
 * из-за внешнего сервиса — это разница между демо и рабочим продуктом.
 */

import 'server-only';

export type GenerateResult = {
  content: string;
  /** 'openai' — текст от модели, 'fallback' — локальный генератор */
  source: 'openai' | 'fallback';
  /** Человеческое объяснение, почему сработал запасной вариант */
  note?: string;
};

const SYSTEM_PROMPT = [
  'Ты помогаешь писать короткие посты для социальной сети Bailanysta.',
  'Пиши на том же языке, на котором задана тема.',
  'Объём — 2–4 предложения, живой человеческий тон, без канцелярита.',
  'В конце добавь 2–3 уместных хэштега.',
  'Не используй кавычки вокруг всего поста и не пиши вступлений вроде «Вот пост».',
].join(' ');

export async function generatePost(topic: string): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return {
      ...offlineDraft(topic),
      note: 'Ключ OPENAI_API_KEY не задан — использован встроенный генератор.',
    };
  }

  try {
    // AbortController: не даём запросу висеть дольше 20 секунд.
    // Без таймаута зависший внешний сервис заблокировал бы нашу функцию.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 20_000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Тема поста: ${topic}` },
        ],
      }),
      signal: abort.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text();
      console.error('[ai] OpenAI ответил ошибкой', response.status, body.slice(0, 300));
      return {
        ...offlineDraft(topic),
        note: `OpenAI вернул ошибку ${response.status} — использован встроенный генератор.`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        ...offlineDraft(topic),
        note: 'OpenAI вернул пустой ответ — использован встроенный генератор.',
      };
    }

    return { content, source: 'openai' };
  } catch (error) {
    console.error('[ai] Не удалось обратиться к OpenAI', error);
    return {
      ...offlineDraft(topic),
      note: 'Внешний сервис недоступен — использован встроенный генератор.',
    };
  }
}

/* ------------------------------------------------------------------ */
/* ВСТРОЕННЫЙ ГЕНЕРАТОР                                                */
/* Простые шаблоны: собирает осмысленный черновик из темы.             */
/* Не притворяется нейросетью — в интерфейсе честно подписано,         */
/* что это черновик-заготовка.                                         */
/* ------------------------------------------------------------------ */

const OPENERS = [
  'Сегодня думал про',
  'Короткая мысль про',
  'Разбирался с темой',
  'Давно хотел написать про',
  'Неочевидное наблюдение про',
];

const BODIES = [
  'Чем дольше в этом сидишь, тем яснее: сложность обычно не в инструменте, а в том, чтобы задать правильный вопрос.',
  'Больше всего времени уходит не на само решение, а на то, чтобы понять, какую задачу мы вообще решаем.',
  'Оказалось, что половина работы — это договориться об определениях. Дальше всё идёт быстрее.',
  'Главный вывод: маленький работающий прототип объясняет идею лучше, чем длинная презентация.',
  'Интересно, что ошибки здесь стоят дёшево, если их находить рано, и очень дорого — если поздно.',
];

const CLOSERS = [
  'Если у вас другой опыт — расскажите, интересно сравнить.',
  'Пока рано делать выводы, но направление мне нравится.',
  'Буду держать в курсе, что из этого выйдет.',
  'Кому близка тема — пишите в комментарии.',
];

function offlineDraft(topic: string): GenerateResult {
  const clean = topic.trim().replace(/[.!?]+$/, '') || 'новые инструменты';
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;

  const tags = clean
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 3)
    .slice(0, 2)
    .map((word) => `#${word}`);

  const content = [
    `${pick(OPENERS)} ${clean}.`,
    pick(BODIES),
    pick(CLOSERS),
    [...tags, '#bailanysta'].join(' '),
  ].join('\n\n');

  return { content, source: 'fallback' };
}
