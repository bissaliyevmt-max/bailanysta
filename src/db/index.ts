/**
 * ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
 * ------------------------------------------------------------------
 * Один пул соединений на весь процесс. Почему пул, а не новое
 * соединение на каждый запрос: в serverless-среде (Vercel) функции
 * живут короткое время, но переиспользуются, и создание соединения
 * на каждый HTTP-запрос быстро упрётся в лимит соединений Postgres.
 *
 * В dev-режиме Next.js перезагружает модули при каждом изменении файла,
 * поэтому пул кэшируется в globalThis — иначе за час разработки
 * накопятся десятки «осиротевших» пулов.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'Не задана переменная окружения DATABASE_URL. Скопируйте .env.example в .env.local и укажите строку подключения к PostgreSQL.',
  );
}

// Локальная база работает без TLS, облачная (Neon, Supabase, Railway) — требует его.
const isLocal =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const globalForDb = globalThis as unknown as { __bailanystaPool?: Pool };

const pool =
  globalForDb.__bailanystaPool ??
  new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 5,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__bailanystaPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
