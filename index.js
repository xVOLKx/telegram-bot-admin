require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ===== КОНФИГУРАЦИЯ =====
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 6186556006; // ⚠️ ЗАМЕНИ НА СВОЙ ID

// ===== ХРАНИЛИЩЕ ЗАЯВОК =====
const orders = [];

// ===== СТАТИСТИКА =====
let stats = {
  orders: 0,
  users: new Set(),
};

// ===== ХРАНИЛИЩЕ ДЛЯ АНТИСПАМА =====
const userCooldown = {};

// ===== ЧЁРНЫЙ СПИСОК СЛОВ (спам-фильтр) =====
const spamWords = ['тест', 'спам', 'проверка', '123', 'test', 'spam'];

// ===== YANDEX GPT (ИИ) =====
async function askYandexGPT(prompt) {
  try {
    const response = await axios.post(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      {
        modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
        completionOptions: {
          temperature: 0.6,
          maxTokens: 200,
        },
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
    console.error('❌ Ошибка ИИ:', err.response?.data || err.message);
    return '⚠️ ИИ временно недоступен. Попробуйте позже.';
  }
}

// ===== КОМАНДЫ =====
bot.start((ctx) => {
  ctx.reply(
    '🌟 *Добро пожаловать!*\n\n' +
    'Я — ваш персональный помощник по заявкам.\n' +
    'Мы разрабатываем ботов, парсеры и API на Node.js.\n\n' +
    '📌 *Что я умею:*\n' +
    '✅ Принимать заявки на разработку\n' +
    '✅ Отвечать на вопросы (с помощью ИИ)\n' +
    '✅ Уведомлять администратора о новых заявках\n\n' +
    '📝 *Чтобы оставить заявку — нажмите кнопку ниже.*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📝 Оставить заявку', 'order')],
        [Markup.button.callback('❓ Помощь', 'help')],
        [Markup.button.callback('🛠️ Админ-панель', 'admin')],
      ])
    }
  );
});

// ===== ОБРАБОТКА КНОПОК =====
bot.action('order', (ctx) => {
  ctx.reply('📝 Напишите вашу заявку в формате:\n/order Ваша заявка');
  ctx.answerCbQuery().catch(() => {});
});

bot.action('help', (ctx) => {
  ctx.reply(
    '📌 *Команды:*\n\n' +
    '/start — главное меню\n' +
    '/order — оставить заявку\n' +
    '/list — список заявок\n' +
    '/admin — админ-панель',
    { parse_mode: 'Markdown' }
  );
  ctx.answerCbQuery().catch(() => {});
});

bot.action('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    ctx.reply('⛔️ У вас нет доступа.');
    return ctx.answerCbQuery().catch(() => {});
  }
  ctx.reply(
    '🛠️ *Админ-панель*\n\n' +
    '/list — список заявок\n' +
    '/stats — статистика\n' +
    '/broadcast — рассылка',
    { parse_mode: 'Markdown' }
  );
  ctx.answerCbQuery().catch(() => {});
});

// ===== HELP =====
bot.help((ctx) => {
  ctx.reply(
    '📌 *Команды:*\n\n' +
    '/start — главное меню\n' +
    '/order — заявка\n' +
    '/list — список заявок\n' +
    '/admin — панель админа',
    { parse_mode: 'Markdown' }
  );
});

// ===== ЗАЯВКА С ЗАЩИТАМИ =====
bot.command('order', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.replace('/order', '').trim();

  if (!text) {
    return ctx.reply('📝 Напишите заявку после команды, например: /order Нужен бот');
  }

  if (text.length < 10) {
    return ctx.reply('📝 Опишите заявку подробнее (минимум 10 символов)');
  }

  if (spamWords.some(word => text.toLowerCase().includes(word))) {
    return ctx.reply('🚫 Ваша заявка похожа на спам. Напишите что-то конкретное.');
  }

  const now = Date.now();
  if (userCooldown[userId] && now - userCooldown[userId] < 60000) {
    return ctx.reply('⏳ Вы слишком часто отправляете заявки. Подождите 1 минуту.');
  }
  userCooldown[userId] = now;

  // ===== СОХРАНЕНИЕ ЗАЯВКИ =====
  const order = {
    id: orders.length + 1,
    username: ctx.from.username || 'без логина',
    userId: ctx.from.id,
    text: text,
    time: new Date().toLocaleString('ru-RU'),
  };
  orders.push(order);

  // ===== ОТПРАВКА АДМИНУ =====
  await bot.telegram.sendMessage(
    ADMIN_ID,
    `📩 **Новая заявка #${order.id}**\n` +
    `👤 От: @${order.username}\n` +
    `🆔 ID: ${order.userId}\n` +
    `📅 Время: ${order.time}\n\n` +
    `📝 Текст:\n${text}`
  );

  // ===== СТАТИСТИКА =====
  stats.orders++;
  stats.users.add(userId);

  // ===== ОТВЕТ ПОЛЬЗОВАТЕЛЮ С ИИ =====
  const answer = await askYandexGPT(
    `Ответь вежливо на заявку: "${text}". Скажи, что заявка принята, и администратор свяжется.`
  );
  ctx.reply(answer);
});

// ===== СПИСОК ЗАЯВОК С КНОПКАМИ =====
bot.command('list', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  if (orders.length === 0) {
    return ctx.reply('📭 Заявок пока нет.');
  }

  const buttons = orders.map(order => [
    Markup.button.callback(
      `📩 Заявка #${order.id} — @${order.username}`,
      `view_${order.id}`
    )
  ]);

  ctx.reply(
    '📋 **Список заявок:**\n\nНажмите на кнопку, чтобы посмотреть детали.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
});

// ===== ПРОСМОТР ЗАЯВКИ ПО КНОПКЕ =====
bot.action(/view_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    ctx.reply('⛔️ У вас нет доступа.');
    return ctx.answerCbQuery().catch(() => {});
  }

  const id = parseInt(ctx.match[1]);
  const order = orders.find(o => o.id === id);

  if (!order) {
    ctx.reply('❌ Заявка с таким номером не найдена.');
    return ctx.answerCbQuery().catch(() => {});
  }

  ctx.reply(
    `📩 **Заявка #${order.id}**\n` +
    `👤 От: @${order.username}\n` +
    `🆔 ID: ${order.userId}\n` +
    `📅 Время: ${order.time}\n\n` +
    `📝 Текст:\n${order.text}`,
  );
  ctx.answerCbQuery().catch(() => {});
});

// ===== СТАТИСТИКА =====
bot.command('stats', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.reply(
    `📊 *Статистика*\n\n` +
    `📩 Всего заявок: ${stats.orders}\n` +
    `👥 Уникальных пользователей: ${stats.users.size}`,
    { parse_mode: 'Markdown' }
  );
});

// ===== РАССЫЛКА (BROADCAST) =====
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const text = ctx.message.text.replace('/broadcast', '').trim();
  if (!text) {
    return ctx.reply('📝 Напишите текст рассылки после команды, например: /broadcast Привет!');
  }

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

// ===== ПОДСКАЗКА ДЛЯ НЕИЗВЕСТНЫХ СООБЩЕНИЙ =====
bot.on('text', (ctx) => {
  ctx.reply(
    '🤔 Я понимаю только команды.\n\n' +
    '📌 Чтобы оставить заявку, напишите:\n' +
    '/order Ваша заявка\n\n' +
    '📌 Или воспользуйтесь кнопками в меню: /start',
    {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📝 Оставить заявку', 'order')],
        [Markup.button.callback('❓ Помощь', 'help')],
      ])
    }
  );
});
// =====  WEB-сервер =====
const express = require('express');
const webApp = express();
const PORT = process.env.PORT || 3000;

webApp.get('/', (req, res) => {
  res.send('Бот работает!');
});

webApp.listen(PORT, () => {
  console.log(`✅ Веб-сервер запущен на порту ${PORT}`);
});

// ===== ЗАПУСК =====
bot.launch()
  .then(() => console.log('✅ Бот запущен!'))
  .catch(err => console.error('❌ Ошибка:', err));