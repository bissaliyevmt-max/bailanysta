/**
 * РАБОТА С ХЭШТЕГАМИ
 * ------------------------------------------------------------------
 * Хэштеги вытаскиваются из текста поста один раз — на сервере, в момент
 * сохранения — и кладутся в отдельную колонку-массив.
 *
 * Почему не искать их регуляркой при каждом запросе: поиск по колонке
 * с индексом на порядок быстрее, чем разбор текста всех постов, и
 * «#finance» не найдётся случайно внутри слова «hashfinance».
 */

// \p{L} — любая буква в любом алфавите, поэтому #финансы и #qarjy работают.
const HASHTAG_RE = /#([\p{L}\p{N}_]{2,30})/gu;

/** Достать уникальные хэштеги из текста, в нижнем регистре, без решётки. */
export function extractHashtags(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(HASHTAG_RE)) {
    found.add(match[1].toLowerCase());
  }
  return [...found];
}

/** Нормализовать поисковый запрос: «#Finance» и «finance» — одно и то же. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#/, '').toLowerCase();
}
