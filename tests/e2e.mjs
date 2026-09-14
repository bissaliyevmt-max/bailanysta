/**
 * СКВОЗНЫЕ (E2E) ТЕСТЫ
 * ==================================================================
 * Проверяют приложение так, как его видит пользователь: реальный
 * браузер, реальные клики, реальная база.
 *
 * Запуск:
 *   1) поднимите приложение:   npm run build && npm start
 *   2) в другом терминале:     npm run test:e2e
 *
 * Первый запуск требует браузера:  npx playwright install chromium
 * (либо укажите свой:  CHROME_PATH=/path/to/chrome npm run test:e2e)
 *
 * Тесты пишут данные в базу, на которую указывает приложение —
 * не запускайте их против продакшена.
 */

import { chromium } from 'playwright';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ru-RU' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const results = [];
const check = (name, cond, extra = '') => {
  results.push(Boolean(cond));
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
};

await page.goto(BASE, { waitUntil: 'networkidle' });

// 1. Создание поста
const before = await page.locator('article').count();
await page.fill('#post-content', 'Проверка публикации поста из браузера #e2e #проверка');
await page.getByRole('button', { name: 'Опубликовать' }).click();
await page.waitForTimeout(1200);
const after = await page.locator('article').count();
check('создание поста', after === before + 1, `было ${before}, стало ${after}`);

// 2. Лайк
const likeBtn = page.locator('article').first().getByRole('button').first();
const likeTextBefore = (await likeBtn.innerText()).trim();
await likeBtn.click();
await page.waitForTimeout(900);
const likeTextAfter = (await likeBtn.innerText()).trim();
check('лайк меняет счётчик', likeTextBefore !== likeTextAfter, `${likeTextBefore} → ${likeTextAfter}`);

// 3. Лайк сохраняется после перезагрузки
await page.reload({ waitUntil: 'networkidle' });
const likeAfterReload = (await page.locator('article').first().getByRole('button').first().innerText()).trim();
check('лайк сохранён в базе', likeAfterReload === likeTextAfter, `после перезагрузки: ${likeAfterReload}`);

// 4. Комментарий
await page.locator('article').first().getByRole('button').nth(1).click();
await page.waitForTimeout(800);
await page.fill('input[placeholder="Написать комментарий…"]', 'Комментарий из автотеста');
await page.getByRole('button', { name: 'Отправить' }).click();
await page.waitForTimeout(1200);
check('комментарий добавлен', (await page.getByText('Комментарий из автотеста').count()) > 0);

// 5. Редактирование поста
await page.locator('article').first().getByRole('button', { name: 'Изменить' }).click();
await page.waitForTimeout(400);
await page.locator('article').first().locator('textarea').fill('Отредактированный текст поста #e2e');
await page.getByRole('button', { name: 'Сохранить' }).click();
await page.waitForTimeout(1200);
check('редактирование поста', (await page.getByText('Отредактированный текст поста').count()) > 0);

// 6. Поиск по хэштегу
await page.fill('#search', '#automation');
await page.press('#search', 'Enter');
await page.waitForTimeout(1500);
const found = await page.locator('article').count();
check('поиск по хэштегу', found > 0 && found < after, `найдено ${found}`);

// 7. Тёмная тема сохраняется
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /тёмную тему|светлую тему/ }).first().click();
await page.waitForTimeout(400);
const darkOn = await page.evaluate(() => document.documentElement.classList.contains('dark'));
await page.reload({ waitUntil: 'networkidle' });
const darkAfterReload = await page.evaluate(() => document.documentElement.classList.contains('dark'));
check('тёмная тема включается', darkOn);
check('тёмная тема переживает перезагрузку', darkAfterReload === darkOn);
await page.getByRole('button', { name: /тёмную тему|светлую тему/ }).first().click();
await page.waitForTimeout(300);

// 8. Переход в профиль
await page.getByRole('link', { name: 'Мой профиль' }).first().click();
await page.waitForURL('**/u/**');
await page.waitForTimeout(1200);
check('роутинг на профиль', page.url().includes('/u/manas'), page.url());
check('профиль показывает статистику', (await page.getByText('постов').count()) > 0);

// 9. Подписка на другого пользователя
await page.goto(BASE + '/u/zhanel', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const followBtn = page.getByRole('button', { name: /Подписаться|Вы подписаны/ }).first();
const followBefore = (await followBtn.innerText()).trim();
await followBtn.click();
await page.waitForTimeout(1200);
const followAfter = (await page.getByRole('button', { name: /Подписаться|Вы подписаны/ }).first().innerText()).trim();
check('подписка переключается', followBefore !== followAfter, `${followBefore} → ${followAfter}`);

// 10. Уведомления
await page.goto(BASE + '/notifications', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
check('страница уведомлений грузится', (await page.locator('li').count()) > 0);

// 11. Смена пользователя
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.locator('aside button').filter({ hasText: '@manas' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Данияр Омаров/ }).click();
await page.waitForTimeout(1800);
const nowUser = await page.locator('aside').innerText();
check('смена пользователя', nowUser.includes('@daniyar'), nowUser.split('\n').pop());

// 12. AI-генерация
await page.getByRole('button', { name: 'Помощь AI' }).click();
await page.waitForTimeout(300);
await page.fill('#ai-topic', 'финансовые дашборды');
await page.getByRole('button', { name: 'Сгенерировать' }).click();
await page.waitForTimeout(2500);
const generated = await page.inputValue('#post-content');
check('AI генерирует черновик', generated.length > 40, `${generated.length} символов`);

const failed = results.filter((r) => !r).length;
console.log(`\nИтог: ${results.length - failed} из ${results.length} проверок пройдено.`);
console.log(errors.length ? `\nОШИБКИ КОНСОЛИ:\n- ${errors.join('\n- ')}` : '\nОшибок в консоли браузера нет.');
await browser.close();
// Ненулевой код выхода — чтобы падение тестов было видно в CI
process.exit(failed > 0 ? 1 : 0);
