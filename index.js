require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');

// ===== КОНФИГУРАЦИЯ =====
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 6186556006; // ⚠️ ЗАМЕНИ НА СВОЙ ID

// ===== УСТАНАВЛИВАЕМ НИЖНЕЕ МЕНЮ =====
bot.telegram.setMyCommands([
  { command: 'start', description: '👋 Главное меню' },
  { command: 'list', description: '📋 Список заявок (админ)' },
  { command: 'stats', description: '📊 Статистика (админ)' },
  { command: 'broadcast', description: '📨 Рассылка (админ)' },
]);

// ===== ХРАНИЛИЩЕ ЗАЯВОК =====
const orders = [];
let stats = { orders: 0, users: new Set() };
const userCooldown = {};
const spamWords = ['тест', 'спам', 'проверка', '123', 'test', 'spam'];

// ===== YANDEX GPT =====
async function askYandexGPT(prompt) {
  try {
    const response = await axios.post(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      {
        modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
        completionOptions: { temperature: 0.6, maxTokens: 200 },
        messages: [{ role: 'user', text: prompt }],
      },
      {
        headers: {
          'Authorization': `Api-Key ${process.env.YANDEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.result.alternatives[0].message.text;
  } catch (err) {
    console.error('❌ Ошибка ИИ:', err.message);
    return '⚠️ ИИ временно недоступен. Попробуйте позже.';
  }
}

// ===== КОМАНДА /start =====
bot.start((ctx) => {
  ctx.reply(
    '🌟 *Добро пожаловать!*\n\n' +
    'Я — ваш персональный помощник по заявкам.\n' +
    'Мы разрабатываем ботов, парсеры и API на Node.js.\n\n' +
    '📌 *Что я умею:*\n' +
    '✅ Принимать заявки на разработку\n' +
    '✅ Отвечать на вопросы (с помощью ИИ)\n' +
    '✅ Уведомлять администратора о новых заявках\n\n' +
    '⬇️ *Используйте кнопки внизу экрана для управления.*',
    { parse_mode: 'Markdown' }
  );
});

// ===== ЗАЯВКА =====
bot.command('order', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.replace('/order', '').trim();

  if (!text) return ctx.reply('📝 Напишите заявку после команды, например: /order Нужен бот');
  if (text.length < 10) return ctx.reply('📝 Опишите заявку подробнее (минимум 10 символов)');
  if (spamWords.some(word => text.toLowerCase().includes(word))) {
    return ctx.reply('🚫 Ваша заявка похожа на спам.');
  }

  const now = Date.now();
  if (userCooldown[userId] && now - userCooldown[userId] < 60000) {
    return ctx.reply('⏳ Подождите 1 минуту между заявками.');
  }
  userCooldown[userId] = now;

  const order = {
    id: orders.length + 1,
    username: ctx.from.username || 'без логина',
    userId: ctx.from.id,
    text,
    time: new Date().toLocaleString('ru-RU'),
  };
  orders.push(order);

  await bot.telegram.sendMessage(
    ADMIN_ID,
    `📩 **Новая заявка #${order.id}**\n👤 От: @${order.username}\n🆔 ID: ${order.userId}\n📅 Время: ${order.time}\n\n📝 Текст:\n${text}`
  );

  stats.orders++;
  stats.users.add(userId);

  const answer = await askYandexGPT(
    `Ответь вежливо на заявку: "${text}". Скажи, что заявка принята, и администратор свяжется.`
  );
  ctx.reply(answer);
});

// ===== СПИСОК ЗАЯВОК =====
bot.command('list', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  if (orders.length === 0) return ctx.reply('📭 Заявок пока нет.');

  const buttons = orders.map(order => [
    Markup.button.callback(`📩 Заявка #${order.id} — @${order.username}`, `view_${order.id}`)
  ]);

  ctx.reply('📋 **Список заявок:**', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
});

bot.action(/view_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔️ Нет доступа.');
  const order = orders.find(o => o.id === parseInt(ctx.match[1]));
  if (!order) return ctx.reply('❌ Заявка не найдена.');
  ctx.reply(
    `📩 **Заявка #${order.id}**\n👤 @${order.username}\n🆔 ${order.userId}\n📅 ${order.time}\n\n📝 ${order.text}`
  );
  ctx.answerCbQuery();});

// ===== СТАТИСТИКА =====
bot.command('stats', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.reply(
    `📊 *Статистика*\n\n📩 Заявок: ${stats.orders}\n👥 Пользователей: ${stats.users.size}`,
    { parse_mode: 'Markdown' }
  );
});

// ===== РАССЫЛКА =====
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const text = ctx.message.text.replace('/broadcast', '').trim();
  if (!text) return ctx.reply('📝 Напишите текст рассылки после команды: /broadcast Привет!');

  ctx.reply(`📤 Начинаю рассылку для ${stats.users.size} пользователей...`);

  let success = 0;
  let fail = 0;
  for (const userId of stats.users) {
    try {
      await bot.telegram.sendMessage(userId, text);
      success++;
    } catch {
      fail++;
    }
  }

  ctx.reply(`✅ Рассылка завершена.\n📨 Отправлено: ${success}\n❌ Не доставлено: ${fail}`);
});

// ===== ПОДСКАЗКА =====
bot.on('text', (ctx) => {
  ctx.reply(
    '🤔 Я понимаю только команды.\n\n📌 /order — заявка\n📌 /start — главное меню',
    {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📝 Заявка', 'order')],
        [Markup.button.callback('❓ Помощь', 'help')],
      ])
    }
  );
});

bot.action('order', (ctx) => {
  ctx.reply('📝 Напишите: /order Ваша заявка');
  ctx.answerCbQuery();
});

bot.action('help', (ctx) => {
  ctx.reply('📌 Команды: /start, /order, /list (админ), /stats (админ)');
  ctx.answerCbQuery();
});

// ===== WEB-СЕРВЕР =====
const webApp = express();
const PORT = process.env.PORT || 3000;
webApp.get('/', (req, res) => res.send('Бот работает!'));
webApp.listen(PORT, () => console.log(`✅ Веб-сервер на порту ${PORT}`));

// ===== ЗАПУСК =====
bot.launch()
  .then(() => console.log('✅ Бот запущен!'))
  .catch(err => console.error('❌ Ошибка:', err));