/**
 * ХЕЛПЕРЫ ДЛЯ API-ЭНДПОИНТОВ
 * ------------------------------------------------------------------
 * Единый формат ответов и обработки ошибок для всех route handlers.
 * Ошибка всегда возвращается как { error: "текст" } с корректным
 * HTTP-статусом — фронтенду не нужно гадать, что пришло.
 */

import { NextResponse } from 'next/server';
import { AppError } from './errors';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Обёртка вокруг обработчика: ловит любое исключение и превращает его
 * в 500 с текстом. Без неё падение запроса к базе вернуло бы
 * пустой ответ, и на фронте была бы невнятная ошибка парсинга JSON.
 */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    // Ошибка валидации или прав — это НЕ сбой сервера: отдаём 4xx.
    if (error instanceof AppError) {
      return fail(error.message, error.status);
    }
    // Всё остальное — настоящая поломка: пишем в лог и отдаём 500.
    console.error('[api]', error);
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    return fail(message, 500);
  }
}

/** Безопасный разбор тела запроса: некорректный JSON не должен ронять сервер. */
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
