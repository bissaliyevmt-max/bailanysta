/**
 * СХЕМА БАЗЫ ДАННЫХ (Drizzle ORM, PostgreSQL)
 * ------------------------------------------------------------------
 * Здесь описаны все таблицы приложения. Drizzle берёт этот файл и:
 *   1) генерирует SQL-миграции (npm run db:push / db:generate);
 *   2) выводит из него TypeScript-типы, поэтому запросы в коде
 *      проверяются компилятором ещё до запуска приложения.
 *
 * Модель данных классической соцсети:
 *   users          — пользователи
 *   posts          — посты (текст + массив хэштегов)
 *   likes          — лайки (связь многие-ко-многим: пользователь ↔ пост)
 *   comments       — комментарии к постам
 *   follows        — подписки (связь пользователь ↔ пользователь)
 *   notifications  — уведомления о лайках, комментариях и подписках
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ */
/* ПОЛЬЗОВАТЕЛИ                                                        */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    // username используется в адресе профиля: /u/manas
    username: varchar('username', { length: 32 }).notNull(),
    displayName: varchar('display_name', { length: 64 }).notNull(),
    bio: text('bio').default('').notNull(),
    // Цвет аватара-заглушки. Картинки в ТЗ необязательны,
    // поэтому аватар — это кружок с инициалами и стабильным цветом.
    avatarColor: varchar('avatar_color', { length: 16 }).default('violet').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_username_idx').on(table.username)],
);

/* ------------------------------------------------------------------ */
/* ПОСТЫ                                                               */
/* ------------------------------------------------------------------ */

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    authorId: integer('author_id')
      .notNull()
      // Удаляем пользователя — удаляются и его посты.
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    // Хэштеги вынесены в отдельную колонку-массив, чтобы поиск
    // по тегу был точным (а не подстрокой внутри текста).
    // Массив заполняется на сервере при создании и редактировании поста.
    hashtags: text('hashtags').array().default([]).notNull(),
    // true, если текст сгенерирован через AI-эндпоинт.
    // Честность важнее: в ленте такой пост помечается значком.
    aiGenerated: boolean('ai_generated').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Лента всегда сортируется по дате убывания — индекс ускоряет выборку.
    index('posts_created_at_idx').on(table.createdAt),
    index('posts_author_idx').on(table.authorId),
  ],
);

/* ------------------------------------------------------------------ */
/* ЛАЙКИ                                                               */
/* ------------------------------------------------------------------ */

export const likes = pgTable(
  'likes',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Составной первичный ключ = один пользователь лайкает пост только один раз.
    // Это ограничение на уровне БД, а не на уровне кода: даже двойной клик
    // или гонка двух запросов не создадут два лайка.
    primaryKey({ columns: [table.postId, table.userId] }),
  ],
);

/* ------------------------------------------------------------------ */
/* КОММЕНТАРИИ                                                         */
/* ------------------------------------------------------------------ */

export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('comments_post_idx').on(table.postId)],
);

/* ------------------------------------------------------------------ */
/* ПОДПИСКИ                                                            */
/* ------------------------------------------------------------------ */

export const follows = pgTable(
  'follows',
  {
    // Кто подписался
    followerId: integer('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // На кого подписались
    followingId: integer('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] })],
);

/* ------------------------------------------------------------------ */
/* УВЕДОМЛЕНИЯ                                                         */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    // Получатель уведомления
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Тот, кто совершил действие
    actorId: integer('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // 'like' | 'comment' | 'follow'
    type: varchar('type', { length: 16 }).notNull(),
    postId: integer('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    // Короткий фрагмент комментария, чтобы не делать лишний JOIN при показе
    preview: text('preview'),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('notifications_user_idx').on(table.userId, table.isRead)],
);

/* ------------------------------------------------------------------ */
/* СВЯЗИ МЕЖДУ ТАБЛИЦАМИ                                               */
/* Нужны, чтобы Drizzle умел делать вложенные выборки (db.query.*)      */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  likes: many(likes),
  comments: many(comments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  likes: many(likes),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, { fields: [likes.postId], references: [posts.id] }),
  user: one(users, { fields: [likes.userId], references: [users.id] }),
}));

/* Типы, выведенные из схемы — используются по всему приложению */
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
