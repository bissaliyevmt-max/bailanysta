# Справочник API

Все эндпоинты возвращают JSON. Ошибка всегда приходит в виде
`{ "error": "текст ошибки" }` с соответствующим HTTP-статусом:

| Статус | Когда |
|---|---|
| `200` / `201` | Успех |
| `400` | Некорректные данные (пустой пост, слишком длинный текст) |
| `403` | Действие запрещено (редактирование чужого поста) |
| `404` | Объект не найден |
| `500` | Настоящая ошибка сервера |

Текущий пользователь определяется по `httpOnly`-cookie `bailanysta_uid`.
Все примеры ниже используют `curl -c cookies.txt -b cookies.txt`,
чтобы cookie сохранялась между запросами.

---

## Посты

### `GET /api/posts`

Лента постов.

| Параметр | Тип | Описание |
|---|---|---|
| `query` | строка | Поиск по тексту или хэштегу. `#finance` и `finance` равнозначны |
| `author` | строка | Только посты этого пользователя (username) |
| `following` | `1` | Только те, на кого подписан текущий пользователь |
| `limit` | число | Сколько вернуть, максимум 50, по умолчанию 20 |
| `offset` | число | Сдвиг для пагинации |

```bash
curl "http://localhost:3000/api/posts?query=%23finance&limit=5"
```

Ответ:

```json
{
  "posts": [
    {
      "id": 6,
      "content": "Мысль после недели с Postgres…",
      "hashtags": ["data", "sql", "finance"],
      "aiGenerated": false,
      "createdAt": "2026-09-14T05:58:00.894Z",
      "updatedAt": "2026-09-14T05:58:00.894Z",
      "author": {
        "id": 1,
        "username": "manas",
        "displayName": "Манас Бисалиев",
        "avatarColor": "violet"
      },
      "likeCount": 3,
      "commentCount": 1,
      "likedByViewer": false,
      "ownedByViewer": true
    }
  ]
}
```

### `POST /api/posts`

```bash
curl -X POST http://localhost:3000/api/posts \
  -H 'Content-Type: application/json' \
  -d '{"content":"Привет, Bailanysta! #первыйпост"}'
```

Тело: `{ content: string, aiGenerated?: boolean }`.
Хэштеги извлекаются из текста на сервере. Максимум 500 символов.

### `GET /api/posts/:id` · `PATCH /api/posts/:id` · `DELETE /api/posts/:id`

`PATCH` принимает `{ content: string }`. Изменять и удалять можно только
свои посты — проверка на сервере, `403` в ответ на чужой.

### `POST /api/posts/:id/like`

Переключатель: ставит лайк, если его нет, и снимает, если есть.

```json
{ "liked": true, "likeCount": 4 }
```

### `GET /api/posts/:id/comments` · `POST /api/posts/:id/comments`

`POST` принимает `{ content: string }`, максимум 300 символов.

---

## Пользователи

### `GET /api/users`

Список всех пользователей. С параметром `?suggestions=1` — только те,
на кого текущий пользователь ещё не подписан.

### `GET /api/users/:username`

```json
{
  "profile": {
    "id": 1,
    "username": "manas",
    "displayName": "Манас Бисалиев",
    "bio": "Head of Treasury…",
    "avatarColor": "violet",
    "postCount": 5,
    "followerCount": 2,
    "followingCount": 2,
    "followedByViewer": false,
    "isViewer": true
  }
}
```

### `POST /api/users/:username/follow`

Переключатель подписки. Подписаться на себя нельзя — `400`.

---

## Текущий пользователь

| Метод | Действие |
|---|---|
| `GET /api/me` | Текущий пользователь, список всех, счётчик непрочитанных |
| `PUT /api/me` | Переключиться: `{ userId: number }` |
| `POST /api/me` | Создать: `{ username, displayName, bio? }` |
| `PATCH /api/me` | Изменить свой профиль: `{ displayName?, bio? }` |

`username` — от 3 до 32 символов, латиница в нижнем регистре, цифры и `_`.

---

## Уведомления

### `GET /api/notifications`

```json
{
  "notifications": [
    {
      "id": 1,
      "type": "comment",
      "postId": 1,
      "preview": "А как решили вопрос с валютной переоценкой?",
      "isRead": false,
      "createdAt": "2026-09-14T09:28:00.000Z",
      "actor": { "id": 2, "username": "aigerim", "displayName": "Айгерим Сатпаева", "avatarColor": "emerald" }
    }
  ],
  "unread": 3
}
```

Тип: `like`, `comment` или `follow`.

### `PATCH /api/notifications`

`{ ids: [1,2] }` — пометить указанные прочитанными.
Пустое тело — пометить все.

---

## Генерация через AI

### `POST /api/ai/generate`

```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -H 'Content-Type: application/json' \
  -d '{"topic":"автоматизация казначейской отчётности"}'
```

```json
{
  "content": "Сегодня думал про автоматизацию казначейской отчётности…",
  "source": "fallback",
  "note": "Ключ OPENAI_API_KEY не задан — использован встроенный генератор."
}
```

`source`: `openai` — текст от модели, `fallback` — встроенный генератор.

**Это единственное место, где приложение обращается к внешнему сервису,
и обращение происходит на сервере.** Браузер отправляет сюда только тему;
ключ читается из переменных окружения внутри `src/lib/ai.ts`, помеченного
директивой `server-only`, и в бандл браузера не попадает.
