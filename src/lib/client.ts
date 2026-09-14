/**
 * КЛИЕНТСКИЙ HTTP-СЛОЙ
 * ------------------------------------------------------------------
 * Тонкая обёртка над fetch, общая для всех компонентов.
 *
 * Зачем она нужна:
 *   1) ошибки API приходят как { error: "..." } — здесь они
 *      превращаются в обычное исключение с понятным текстом;
 *   2) нигде в компонентах не приходится повторять заголовки и JSON.stringify;
 *   3) если завтра появится базовый URL или заголовок авторизации,
 *      править нужно один файл.
 *
 * Намеренно НЕ подключаем SWR/React Query: в проекте такого размера
 * они добавляют зависимость и понятийную нагрузку ради пары экранов
 * (см. раздел «компромиссы» в README).
 */

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data?.error ?? `Ошибка запроса (${response.status})`);
  }

  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
