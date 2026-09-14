/**
 * Конфигурация drizzle-kit — инструмента миграций.
 *   npm run db:push     — синхронизировать схему с базой (быстро, для разработки)
 *   npm run db:generate — сгенерировать SQL-файл миграции (для продакшена)
 *   npm run db:studio   — открыть визуальный просмотрщик базы
 */
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Читаем .env.local, чтобы drizzle-kit видел DATABASE_URL так же, как Next.js
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
