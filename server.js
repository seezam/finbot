const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_USER_ID = parseInt(process.env.ALLOWED_USER_ID);

if (!BOT_TOKEN) {
  console.error('Ошибка: BOT_TOKEN не установлен в переменных окружения');
  process.exit(1);
}

if (!ALLOWED_USER_ID) {
  console.error('Ошибка: ALLOWED_USER_ID не установлен в переменных окружения');
  process.exit(1);
}
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

const bot = new Telegraf(BOT_TOKEN);

// Middleware для проверки пользователя
bot.use(async (ctx, next) => {
  if (ctx.from && ctx.from.id !== ALLOWED_USER_ID) {
    return;
  }
  await next();
});

bot.start((ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Создать счет', 'create_account')],
    [Markup.button.callback('Просмотреть счета', 'list_accounts')],
    [Markup.button.callback('Добавить транзакцию', 'add_transaction')],
    [Markup.button.callback('Общий баланс', 'total_balance')]
  ]);
  ctx.reply('Выберите действие:', keyboard);
});

bot.action('create_account', async (ctx) => {
  ctx.editMessageText('Введите название нового счета:');
  await setSession(ctx.from.id, { action: 'create_account' });
});

bot.action('list_accounts', async (ctx) => {
  const accounts = await getAccounts();
  if (accounts.length === 0) {
    ctx.editMessageText('Нет счетов.');
  } else {
    const text = 'Ваши счета:\n' + accounts.map(acc => `${acc.name}: ${acc.balance}`).join('\n');
    const keyboard = accounts.map(acc => [Markup.button.callback(`Редактировать ${acc.name}`, `edit_${acc.id}`)]);
    keyboard.push([Markup.button.callback('Назад', 'back')]);
    ctx.editMessageText(text, Markup.inlineKeyboard(keyboard));
  }
});

bot.action('add_transaction', async (ctx) => {
  const accounts = await getAccounts();
  if (accounts.length === 0) {
    ctx.editMessageText('Сначала создайте счет.');
  } else {
    const keyboard = accounts.map(acc => [Markup.button.callback(acc.name, `select_acc_${acc.id}`)]);
    ctx.editMessageText('Выберите счет для транзакции:', Markup.inlineKeyboard(keyboard));
    await setSession(ctx.from.id, { action: 'add_transaction' });
  }
});

bot.action('total_balance', async (ctx) => {
  const accounts = await getAccounts();
  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  ctx.editMessageText(`Общий баланс: ${total}`);
});

bot.action(/^edit_(.+)$/, async (ctx) => {
  const accId = ctx.match[1];
  await setSession(ctx.from.id, { action: 'edit_account', editAccId: accId });
  ctx.editMessageText('Введите новое название счета:');
});

bot.action('back', (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Создать счет', 'create_account')],
    [Markup.button.callback('Просмотреть счета', 'list_accounts')],
    [Markup.button.callback('Добавить транзакцию', 'add_transaction')],
    [Markup.button.callback('Общий баланс', 'total_balance')]
  ]);
  ctx.editMessageText('Выберите действие:', keyboard);
});

bot.action(/^select_acc_(.+)$/, async (ctx) => {
  const accId = ctx.match[1];
  await setSession(ctx.from.id, { action: 'enter_transaction', selectedAcc: accId });
  ctx.editMessageText('Введите сумму (положительная для прихода, отрицательная для расхода) и описание через пробел:');
});

bot.on('text', async (ctx) => {
  const session = await getSession(ctx.from.id);
  if (!session) return;
  const action = session.action;
  const text = ctx.message.text;

  if (action === 'create_account') {
    await createAccount(text);
    ctx.reply(`Счет '${text}' создан.`);
    await deleteSession(ctx.from.id);
  } else if (action === 'edit_account') {
    const accId = session.editAccId;
    await editAccount(accId, text);
    ctx.reply(`Счет переименован в '${text}'.`);
    await deleteSession(ctx.from.id);
  } else if (action === 'enter_transaction') {
    try {
      const parts = text.split(' ', 2);
      const amount = parseFloat(parts[0]);
      const desc = parts[1] || '';
      const accId = session.selectedAcc;
      await addTransaction(accId, amount, desc);
      ctx.reply('Транзакция добавлена.');
      await deleteSession(ctx.from.id);
    } catch (e) {
      ctx.reply('Неверный формат. Введите число и описание.');
    }
  }
});

// Функции для работы с данными
async function getAccounts() {
  const data = await loadData();
  return Object.entries(data.accounts).map(([id, acc]) => ({ id, ...acc }));
}

async function createAccount(name) {
  const data = await loadData();
  const id = Date.now().toString();
  data.accounts[id] = { name, balance: 0 };
  await saveData(data);
}

async function editAccount(id, newName) {
  const data = await loadData();
  if (data.accounts[id]) {
    data.accounts[id].name = newName;
    await saveData(data);
  }
}

async function addTransaction(accId, amount, desc) {
  const data = await loadData();
  const trans = { accountId: accId, amount, description: desc, date: new Date().toISOString() };
  data.transactions.push(trans);
  if (data.accounts[accId]) {
    data.accounts[accId].balance += amount;
  }
  await saveData(data);
}

async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    // Убеждаемся, что структура данных правильная
    if (!parsed.accounts) parsed.accounts = {};
    if (!parsed.transactions) parsed.transactions = [];
    if (!parsed.sessions) parsed.sessions = {};
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { accounts: {}, transactions: [], sessions: {} };
    }
    throw error;
  }
}

async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function getSession(userId) {
  const data = await loadData();
  return data.sessions && data.sessions[userId] ? data.sessions[userId] : null;
}

async function setSession(userId, session) {
  const data = await loadData();
  if (!data.sessions) {
    data.sessions = {};
  }
  data.sessions[userId] = session;
  await saveData(data);
}

async function deleteSession(userId) {
  const data = await loadData();
  if (data.sessions && data.sessions[userId]) {
    delete data.sessions[userId];
    await saveData(data);
  }
}

// Webhook endpoint для Telegram
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('Received webhook update type:', update?.message?.text || update?.callback_query?.data || update?.update_id);
    
    // Обрабатываем обновление с таймаутом
    await Promise.race([
      bot.handleUpdate(update),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Update handling timeout')), 10000)
      )
    ]);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    console.error('Error stack:', error.stack);
    // Всегда возвращаем 200 OK, чтобы Telegram не считал webhook неработающим
    res.status(200).send('OK');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'FinBot Telegram Bot is running',
    endpoints: {
      webhook: 'POST /webhook',
      health: 'GET /health'
    }
  });
});

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`BOT_TOKEN: ${BOT_TOKEN ? 'SET' : 'NOT SET'}`);
  console.log(`ALLOWED_USER_ID: ${ALLOWED_USER_ID || 'NOT SET'}`);
  console.log(`Webhook endpoint: POST /webhook`);
  console.log(`Health check: GET /health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Обработка ошибок бота
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  console.error('Error stack:', err.stack);
  // Пытаемся отправить сообщение об ошибке пользователю
  if (ctx && ctx.reply) {
    ctx.reply('Произошла ошибка. Попробуйте еще раз.').catch(e => {
      console.error('Failed to send error message:', e);
    });
  }
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Не завершаем процесс, чтобы сервер продолжал работать
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

