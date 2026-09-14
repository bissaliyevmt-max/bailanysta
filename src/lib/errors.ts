/**
 * ОШИБКИ ПРИЛОЖЕНИЯ
 * ------------------------------------------------------------------
 * Обычный Error не несёт HTTP-статуса, поэтому любая ошибка валидации
 * («пустой текст поста») превращалась бы в 500 — как будто сервер
 * сломался. А это не поломка, это некорректный запрос: 400.
 *
 * AppError несёт статус с собой, и обработчик в http.ts его использует.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 400 — клиент прислал некорректные данные */
export const badRequest = (message: string) => new AppError(message, 400);
/** 403 — данные корректны, но действие запрещено */
export const forbidden = (message: string) => new AppError(message, 403);
/** 404 — объекта не существует */
export const notFound = (message: string) => new AppError(message, 404);
