/**
 * СЛОЙ ДОСТУПА К ДАННЫМ
 * ==================================================================
 * Единственное место в проекте, где пишутся запросы к базе.
 * API-эндпоинты (src/app/api/**) только разбирают HTTP-запрос,
 * вызывают функцию отсюда и отдают результат.
 *
 * Зачем такое разделение: бизнес-логика («лайк ставится один раз»,
 * «автор не получает уведомление о собственном лайке») живёт в одном
 * месте, а не размазана по эндпоинтам. Если завтра появится
 * мобильное приложение или фоновая задача — они переиспользуют
 * эти же функции без копирования SQL.
 */

import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { comments, follows, likes, notifications, posts, users } from '@/db/schema';
import { extractHashtags, normalizeTag } from './hashtags';
import { badRequest, forbidden, notFound } from './errors';

/* ------------------------------------------------------------------ */
/* ТИПЫ, КОТОРЫЕ ОТДАЁТ API                                            */
/* ------------------------------------------------------------------ */

export type PostDTO = {
  id: number;
  content: string;
  hashtags: string[];
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string;
    displayName: string;
    avatarColor: string;
  };
  likeCount: number;
  commentCount: number;
  /** Поставил ли лайк тот, кто сейчас смотрит ленту */
  likedByViewer: boolean;
  /** Может ли текущий пользователь редактировать/удалять этот пост */
  ownedByViewer: boolean;
};

export type CommentDTO = {
  id: number;
  content: string;
  createdAt: string;
  author: PostDTO['author'];
};

export type ProfileDTO = {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  avatarColor: string;
  createdAt: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  /** Подписан ли текущий пользователь на этого */
  followedByViewer: boolean;
  isViewer: boolean;
};

/* ------------------------------------------------------------------ */
/* ВСПОМОГАТЕЛЬНЫЕ ПОДЗАПРОСЫ                                          */
/* Считаем лайки и комментарии прямо в SQL одним запросом.             */
/* Альтернатива — тянуть все лайки в Node и считать там — это классика */
/* проблемы N+1 и на тысяче постов приложение встанет.                 */
/* ------------------------------------------------------------------ */

const likeCountSql = sql<number>`(
  select count(*)::int from ${likes} where ${likes.postId} = ${posts.id}
)`;

const commentCountSql = sql<number>`(
  select count(*)::int from ${comments} where ${comments.postId} = ${posts.id}
)`;

function likedByViewerSql(viewerId: number | null) {
  if (viewerId === null) return sql<boolean>`false`;
  return sql<boolean>`exists(
    select 1 from ${likes}
    where ${likes.postId} = ${posts.id} and ${likes.userId} = ${viewerId}
  )`;
}

const POST_COLUMNS = {
  id: posts.id,
  content: posts.content,
  hashtags: posts.hashtags,
  aiGenerated: posts.aiGenerated,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
  authorId: users.id,
  authorUsername: users.username,
  authorDisplayName: users.displayName,
  authorAvatarColor: users.avatarColor,
};

type PostRow = {
  id: number;
  content: string;
  hashtags: string[];
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorId: number;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarColor: string;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
};

function toPostDTO(row: PostRow, viewerId: number | null): PostDTO {
  return {
    id: row.id,
    content: row.content,
    hashtags: row.hashtags ?? [],
    aiGenerated: row.aiGenerated,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: {
      id: row.authorId,
      username: row.authorUsername,
      displayName: row.authorDisplayName,
      avatarColor: row.authorAvatarColor,
    },
    likeCount: Number(row.likeCount),
    commentCount: Number(row.commentCount),
    likedByViewer: Boolean(row.likedByViewer),
    ownedByViewer: viewerId !== null && row.authorId === viewerId,
  };
}

/* ------------------------------------------------------------------ */
/* ЛЕНТА И ПОИСК                                                       */
/* ------------------------------------------------------------------ */

export type ListPostsOptions = {
  viewerId: number | null;
  /** Только посты этого пользователя (страница профиля) */
  authorUsername?: string;
  /** Поиск по тексту или по хэштегу */
  query?: string;
  /** Только посты тех, на кого подписан текущий пользователь */
  followingOnly?: boolean;
  limit?: number;
  offset?: number;
};

export async function listPosts(options: ListPostsOptions): Promise<PostDTO[]> {
  const { viewerId, authorUsername, query, followingOnly, limit = 20, offset = 0 } = options;

  const conditions = [];

  if (authorUsername) {
    conditions.push(eq(users.username, authorUsername));
  }

  if (query && query.trim()) {
    const raw = query.trim();
    const tag = normalizeTag(raw);
    conditions.push(
      or(
        // Поиск по тексту — регистронезависимый LIKE
        ilike(posts.content, `%${raw}%`),
        // Поиск по хэштегу — точное совпадение элемента массива.
        // Оператор && в Postgres = «массивы пересекаются».
        sql`${posts.hashtags} && ARRAY[${tag}]::text[]`,
      ),
    );
  }

  if (followingOnly && viewerId !== null) {
    conditions.push(
      sql`exists(
        select 1 from ${follows}
        where ${follows.followerId} = ${viewerId}
          and ${follows.followingId} = ${posts.authorId}
      )`,
    );
  }

  const rows = await db
    .select({
      ...POST_COLUMNS,
      likeCount: likeCountSql,
      commentCount: commentCountSql,
      likedByViewer: likedByViewerSql(viewerId),
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(Math.min(limit, 50))
    .offset(offset);

  return rows.map((row) => toPostDTO(row as PostRow, viewerId));
}

export async function getPost(id: number, viewerId: number | null): Promise<PostDTO | null> {
  const rows = await db
    .select({
      ...POST_COLUMNS,
      likeCount: likeCountSql,
      commentCount: commentCountSql,
      likedByViewer: likedByViewerSql(viewerId),
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.id, id))
    .limit(1);

  const row = rows[0];
  return row ? toPostDTO(row as PostRow, viewerId) : null;
}

/* ------------------------------------------------------------------ */
/* СОЗДАНИЕ / РЕДАКТИРОВАНИЕ / УДАЛЕНИЕ ПОСТА                          */
/* ------------------------------------------------------------------ */

export const MAX_POST_LENGTH = 500;

/** Проверка текста поста. Валидация на сервере, а не только в форме:
 *  клиентскую проверку легко обойти запросом через curl. */
export function validatePostContent(content: unknown): string {
  if (typeof content !== 'string') throw badRequest('Текст поста обязателен');
  const trimmed = content.trim();
  if (!trimmed) throw badRequest('Текст поста не может быть пустым');
  if (trimmed.length > MAX_POST_LENGTH) {
    throw badRequest(`Текст поста не может быть длиннее ${MAX_POST_LENGTH} символов`);
  }
  return trimmed;
}

export async function createPost(params: {
  authorId: number;
  content: string;
  aiGenerated?: boolean;
}): Promise<PostDTO> {
  const content = validatePostContent(params.content);

  const [created] = await db
    .insert(posts)
    .values({
      authorId: params.authorId,
      content,
      hashtags: extractHashtags(content),
      aiGenerated: params.aiGenerated ?? false,
    })
    .returning({ id: posts.id });

  const post = await getPost(created!.id, params.authorId);
  return post!;
}

export async function updatePost(params: {
  postId: number;
  viewerId: number;
  content: string;
}): Promise<PostDTO> {
  const content = validatePostContent(params.content);

  const [existing] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, params.postId))
    .limit(1);

  if (!existing) throw notFound('Пост не найден');
  // Проверка прав на сервере: редактировать можно только свой пост.
  if (existing.authorId !== params.viewerId) throw forbidden('Можно редактировать только свои посты');

  await db
    .update(posts)
    .set({ content, hashtags: extractHashtags(content), updatedAt: new Date() })
    .where(eq(posts.id, params.postId));

  const post = await getPost(params.postId, params.viewerId);
  return post!;
}

export async function deletePost(params: { postId: number; viewerId: number }): Promise<void> {
  const [existing] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, params.postId))
    .limit(1);

  if (!existing) throw notFound('Пост не найден');
  if (existing.authorId !== params.viewerId) throw forbidden('Можно удалять только свои посты');

  // Лайки, комментарии и уведомления удалятся каскадом — это задано
  // в схеме через onDelete: 'cascade', а не ручными запросами.
  await db.delete(posts).where(eq(posts.id, params.postId));
}

/* ------------------------------------------------------------------ */
/* ЛАЙКИ                                                               */
/* ------------------------------------------------------------------ */

export async function toggleLike(params: {
  postId: number;
  viewerId: number;
}): Promise<{ liked: boolean; likeCount: number }> {
  const [post] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, params.postId))
    .limit(1);

  if (!post) throw notFound('Пост не найден');

  const [existing] = await db
    .select({ userId: likes.userId })
    .from(likes)
    .where(and(eq(likes.postId, params.postId), eq(likes.userId, params.viewerId)))
    .limit(1);

  let liked: boolean;

  if (existing) {
    await db
      .delete(likes)
      .where(and(eq(likes.postId, params.postId), eq(likes.userId, params.viewerId)));
    liked = false;
  } else {
    await db.insert(likes).values({ postId: params.postId, userId: params.viewerId });
    liked = true;

    // Уведомление автору — но не самому себе.
    if (post.authorId !== params.viewerId) {
      await createNotification({
        userId: post.authorId,
        actorId: params.viewerId,
        type: 'like',
        postId: params.postId,
      });
    }
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(likes)
    .where(eq(likes.postId, params.postId));

  return { liked, likeCount: Number(count) };
}

/* ------------------------------------------------------------------ */
/* КОММЕНТАРИИ                                                         */
/* ------------------------------------------------------------------ */

export async function listComments(postId: number): Promise<CommentDTO[]> {
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      authorId: users.id,
      authorUsername: users.username,
      authorDisplayName: users.displayName,
      authorAvatarColor: users.avatarColor,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.postId, postId))
    .orderBy(comments.createdAt);

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.authorId,
      username: row.authorUsername,
      displayName: row.authorDisplayName,
      avatarColor: row.authorAvatarColor,
    },
  }));
}

export async function addComment(params: {
  postId: number;
  viewerId: number;
  content: string;
}): Promise<CommentDTO> {
  const content = String(params.content ?? '').trim();
  if (!content) throw badRequest('Комментарий не может быть пустым');
  if (content.length > 300) throw badRequest('Комментарий не может быть длиннее 300 символов');

  const [post] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, params.postId))
    .limit(1);

  if (!post) throw notFound('Пост не найден');

  const [created] = await db
    .insert(comments)
    .values({ postId: params.postId, authorId: params.viewerId, content })
    .returning({ id: comments.id });

  if (post.authorId !== params.viewerId) {
    await createNotification({
      userId: post.authorId,
      actorId: params.viewerId,
      type: 'comment',
      postId: params.postId,
      preview: content.slice(0, 120),
    });
  }

  const all = await listComments(params.postId);
  return all.find((c) => c.id === created!.id)!;
}

/* ------------------------------------------------------------------ */
/* ПРОФИЛИ И ПОДПИСКИ                                                  */
/* ------------------------------------------------------------------ */

export async function getProfile(
  username: string,
  viewerId: number | null,
): Promise<ProfileDTO | null> {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      avatarColor: users.avatarColor,
      createdAt: users.createdAt,
      postCount: sql<number>`(select count(*)::int from ${posts} where ${posts.authorId} = ${users.id})`,
      followerCount: sql<number>`(select count(*)::int from ${follows} where ${follows.followingId} = ${users.id})`,
      followingCount: sql<number>`(select count(*)::int from ${follows} where ${follows.followerId} = ${users.id})`,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!row) return null;

  let followedByViewer = false;
  if (viewerId !== null && viewerId !== row.id) {
    const [f] = await db
      .select({ id: follows.followerId })
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, row.id)))
      .limit(1);
    followedByViewer = Boolean(f);
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    avatarColor: row.avatarColor,
    createdAt: row.createdAt.toISOString(),
    postCount: Number(row.postCount),
    followerCount: Number(row.followerCount),
    followingCount: Number(row.followingCount),
    followedByViewer,
    isViewer: viewerId === row.id,
  };
}

export async function toggleFollow(params: {
  targetUsername: string;
  viewerId: number;
}): Promise<{ following: boolean; followerCount: number }> {
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, params.targetUsername))
    .limit(1);

  if (!target) throw notFound('Пользователь не найден');
  if (target.id === params.viewerId) throw badRequest('Нельзя подписаться на самого себя');

  const [existing] = await db
    .select({ id: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, params.viewerId), eq(follows.followingId, target.id)))
    .limit(1);

  let following: boolean;

  if (existing) {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, params.viewerId), eq(follows.followingId, target.id)));
    following = false;
  } else {
    await db.insert(follows).values({ followerId: params.viewerId, followingId: target.id });
    following = true;
    await createNotification({ userId: target.id, actorId: params.viewerId, type: 'follow' });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, target.id));

  return { following, followerCount: Number(count) };
}

/** Кого стоит почитать: пользователи, на которых ещё нет подписки. */
export async function listSuggestions(viewerId: number | null, limit = 5) {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarColor: users.avatarColor,
      bio: users.bio,
    })
    .from(users)
    .where(
      viewerId === null
        ? undefined
        : and(
            sql`${users.id} <> ${viewerId}`,
            sql`not exists(
              select 1 from ${follows}
              where ${follows.followerId} = ${viewerId} and ${follows.followingId} = ${users.id}
            )`,
          ),
    )
    .limit(limit);

  return rows;
}

export async function listUsers() {
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarColor: users.avatarColor,
    })
    .from(users)
    .orderBy(users.id);
}

/* ------------------------------------------------------------------ */
/* УВЕДОМЛЕНИЯ                                                         */
/* ------------------------------------------------------------------ */

export async function createNotification(params: {
  userId: number;
  actorId: number;
  type: 'like' | 'comment' | 'follow';
  postId?: number;
  preview?: string;
}) {
  await db.insert(notifications).values({
    userId: params.userId,
    actorId: params.actorId,
    type: params.type,
    postId: params.postId ?? null,
    preview: params.preview ?? null,
  });
}

export type NotificationDTO = {
  id: number;
  type: string;
  postId: number | null;
  preview: string | null;
  isRead: boolean;
  createdAt: string;
  actor: PostDTO['author'];
};

export async function listNotifications(viewerId: number): Promise<NotificationDTO[]> {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      postId: notifications.postId,
      preview: notifications.preview,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      actorId: users.id,
      actorUsername: users.username,
      actorDisplayName: users.displayName,
      actorAvatarColor: users.avatarColor,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.actorId))
    .where(eq(notifications.userId, viewerId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    postId: row.postId,
    preview: row.preview,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
    actor: {
      id: row.actorId,
      username: row.actorUsername,
      displayName: row.actorDisplayName,
      avatarColor: row.actorAvatarColor,
    },
  }));
}

export async function countUnreadNotifications(viewerId: number): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, viewerId), eq(notifications.isRead, false)));
  return Number(count);
}

export async function markNotificationsRead(viewerId: number, ids?: number[]) {
  const where =
    ids && ids.length
      ? and(eq(notifications.userId, viewerId), inArray(notifications.id, ids))
      : eq(notifications.userId, viewerId);

  await db.update(notifications).set({ isRead: true }).where(where);
}

/* ------------------------------------------------------------------ */
/* ПОЛЬЗОВАТЕЛИ                                                        */
/* ------------------------------------------------------------------ */

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

export async function createUser(params: {
  username: string;
  displayName: string;
  bio?: string;
}) {
  const username = String(params.username ?? '').trim().toLowerCase();
  const displayName = String(params.displayName ?? '').trim();

  if (!USERNAME_RE.test(username)) {
    throw badRequest('Имя пользователя: 3–32 символа, только латиница в нижнем регистре, цифры и _');
  }
  if (!displayName) throw badRequest('Укажите отображаемое имя');

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) throw badRequest('Такое имя пользователя уже занято');

  const palette = ['violet', 'emerald', 'amber', 'sky', 'rose', 'indigo'];

  const [created] = await db
    .insert(users)
    .values({
      username,
      displayName,
      bio: String(params.bio ?? '').trim(),
      avatarColor: palette[Math.floor(Math.random() * palette.length)]!,
    })
    .returning();

  return created!;
}

export async function updateProfile(params: {
  viewerId: number;
  displayName?: string;
  bio?: string;
}) {
  const patch: Record<string, string> = {};

  if (typeof params.displayName === 'string') {
    const value = params.displayName.trim();
    if (!value) throw badRequest('Имя не может быть пустым');
    if (value.length > 64) throw badRequest('Имя не может быть длиннее 64 символов');
    patch.displayName = value;
  }

  if (typeof params.bio === 'string') {
    const value = params.bio.trim();
    if (value.length > 200) throw badRequest('Описание не может быть длиннее 200 символов');
    patch.bio = value;
  }

  if (!Object.keys(patch).length) throw badRequest('Нечего обновлять');

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, params.viewerId))
    .returning();

  return updated!;
}
