/**
 * ЗАПОЛНЕНИЕ БАЗЫ ДЕМО-ДАННЫМИ
 * ------------------------------------------------------------------
 * Запуск: npm run db:seed
 * (переменные окружения подхватываются через флаг --env-file=.env.local —
 *  обычный dotenv здесь не сработал бы, потому что import'ы в ES-модулях
 *  выполняются раньше любого кода в теле файла)
 *
 * Пустая соцсеть выглядит сломанной: непонятно, работает лента или нет.
 * Поэтому при первом запуске создаём несколько пользователей, посты,
 * лайки, комментарии и подписки — приложение сразу можно потрогать.
 *
 * Скрипт идемпотентный: повторный запуск очищает таблицы и заполняет
 * их заново, а не плодит дубли.
 */

import { sql } from 'drizzle-orm';
import { db } from './index';
import { comments, follows, likes, notifications, posts, users } from './schema';
import { extractHashtags } from '../lib/hashtags';

const PEOPLE = [
  {
    username: 'manas',
    displayName: 'Манас Бисалиев',
    bio: 'Head of Treasury. Считаю ликвидность днём, собираю дашборды ночью. #finance #data',
    avatarColor: 'violet',
  },
  {
    username: 'aigerim',
    displayName: 'Айгерим Сатпаева',
    bio: 'Product analyst. Живу в SQL и в спорах о метриках.',
    avatarColor: 'emerald',
  },
  {
    username: 'daniyar',
    displayName: 'Данияр Омаров',
    bio: 'Backend-инженер. Пишу на TypeScript, спорю про базы данных.',
    avatarColor: 'sky',
  },
  {
    username: 'zhanel',
    displayName: 'Жанель Ахметова',
    bio: 'Дизайнер интерфейсов. Тёмная тема — не мода, а гигиена.',
    avatarColor: 'rose',
  },
  {
    username: 'timur',
    displayName: 'Тимур Ержанов',
    bio: 'Автоматизирую рутину: n8n, вебхуки, немного магии.',
    avatarColor: 'amber',
  },
];

const POSTS: Array<{ author: string; content: string; aiGenerated?: boolean }> = [
  {
    author: 'manas',
    content:
      'Собрал прогноз денежного потока на 13 недель без единой ручной выгрузки: банк отдаёт выписку по API, дальше всё считается само.\n\nСамое сложное было не в коде, а в том, чтобы договориться, что именно считать «свободными деньгами».\n\n#treasury #automation #finance',
  },
  {
    author: 'aigerim',
    content:
      'Главный навык аналитика — не SQL, а умение спросить «а какое решение вы примете по этой цифре?».\n\nПоловина дашбордов перестаёт быть нужной прямо на этом вопросе.\n\n#analytics #product',
  },
  {
    author: 'daniyar',
    content:
      'Напоминание самому себе: индекс на колонку, по которой сортируешь ленту, дороже любой оптимизации на фронте.\n\n#backend #postgres',
  },
  {
    author: 'zhanel',
    content:
      'Тёмная тема, которая не сохраняет выбор между заходами, — это не тёмная тема, а издевательство.\n\n#design #ux',
  },
  {
    author: 'timur',
    content:
      'За выходные собрал бота, который разносит банковские платежи по статьям бюджета. Точность 92%, остальное доразмечаю руками.\n\nЭкономит примерно четыре часа в неделю.\n\n#automation #finance',
  },
  {
    author: 'manas',
    content:
      'Мысль после недели с Postgres: финансист, который понимает JOIN, перестаёт зависеть от очереди задач в IT.\n\nЭто не про смену профессии. Это про то, чтобы не ждать три недели ради одной выгрузки.\n\n#data #sql #finance',
  },
  {
    author: 'aigerim',
    content:
      'Написала пост про A/B тесты с помощью генерации — и переписала половину руками. AI хорош как черновик, но выводы всё равно твои.\n\n#ai #analytics',
    aiGenerated: true,
  },
  {
    author: 'daniyar',
    content:
      'Спор дня: нужен ли ORM. Мой ответ — нужен, пока он не мешает написать обычный SQL там, где так понятнее.\n\n#backend #typescript',
  },
];

async function main() {
  console.log('Очищаю таблицы...');
  // TRUNCATE ... RESTART IDENTITY сбрасывает и счётчики id,
  // чтобы демо-данные каждый раз выглядели одинаково.
  await db.execute(
    sql`truncate table ${notifications}, ${comments}, ${likes}, ${follows}, ${posts}, ${users} restart identity cascade`,
  );

  console.log('Создаю пользователей...');
  const createdUsers = await db.insert(users).values(PEOPLE).returning();
  const byUsername = new Map(createdUsers.map((u) => [u.username, u]));

  console.log('Создаю посты...');
  const now = Date.now();
  const postRows = POSTS.map((post, index) => ({
    authorId: byUsername.get(post.author)!.id,
    content: post.content,
    hashtags: extractHashtags(post.content),
    aiGenerated: post.aiGenerated ?? false,
    // Разносим посты по времени, чтобы лента выглядела естественно
    createdAt: new Date(now - (POSTS.length - index) * 3.5 * 3600 * 1000),
    updatedAt: new Date(now - (POSTS.length - index) * 3.5 * 3600 * 1000),
  }));
  const createdPosts = await db.insert(posts).values(postRows).returning();

  console.log('Раздаю лайки, комментарии и подписки...');

  const likeRows: Array<{ postId: number; userId: number }> = [];
  createdPosts.forEach((post, index) => {
    createdUsers.forEach((user, userIndex) => {
      // Псевдослучайно, но детерминированно: лента выглядит живой,
      // а результат seed воспроизводим.
      if (user.id !== post.authorId && (index + userIndex) % 3 !== 0) {
        likeRows.push({ postId: post.id, userId: user.id });
      }
    });
  });
  await db.insert(likes).values(likeRows);

  await db.insert(comments).values([
    {
      postId: createdPosts[0]!.id,
      authorId: byUsername.get('aigerim')!.id,
      content: 'А как решили вопрос с валютной переоценкой внутри прогноза?',
    },
    {
      postId: createdPosts[0]!.id,
      authorId: byUsername.get('timur')!.id,
      content: 'Интересно, покажешь схему потоков?',
    },
    {
      postId: createdPosts[5]!.id,
      authorId: byUsername.get('daniyar')!.id,
      content: 'Плюсую. Финансист с SQL — это отдельный вид супергероя.',
    },
    {
      postId: createdPosts[3]!.id,
      authorId: byUsername.get('manas')!.id,
      content: 'Подписываюсь под каждым словом.',
    },
  ]);

  const followRows: Array<{ followerId: number; followingId: number }> = [];
  createdUsers.forEach((follower, i) => {
    createdUsers.forEach((following, j) => {
      if (i !== j && (i + j) % 2 === 0) {
        followRows.push({ followerId: follower.id, followingId: following.id });
      }
    });
  });
  await db.insert(follows).values(followRows);

  console.log('Создаю уведомления для демонстрации...');
  await db.insert(notifications).values([
    {
      userId: byUsername.get('manas')!.id,
      actorId: byUsername.get('aigerim')!.id,
      type: 'comment',
      postId: createdPosts[0]!.id,
      preview: 'А как решили вопрос с валютной переоценкой внутри прогноза?',
    },
    {
      userId: byUsername.get('manas')!.id,
      actorId: byUsername.get('daniyar')!.id,
      type: 'like',
      postId: createdPosts[5]!.id,
    },
    {
      userId: byUsername.get('manas')!.id,
      actorId: byUsername.get('zhanel')!.id,
      type: 'follow',
    },
  ]);

  console.log(
    `Готово: ${createdUsers.length} пользователей, ${createdPosts.length} постов, ${likeRows.length} лайков.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error('Ошибка при заполнении базы:', error);
  process.exit(1);
});
