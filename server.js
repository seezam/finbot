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

// Функция для создания главного меню
function getMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➕ Создать счет', 'create_account')],
    [Markup.button.callback('📋 Просмотреть счета', 'list_accounts')],
    [Markup.button.callback('💰 Добавить транзакцию', 'add_transaction')],
    [Markup.button.callback('💵 Общий баланс', 'total_balance')]
  ]);
}

// Функция для получения текста меню с балансом
async function getMenuText() {
  const accounts = await getAccounts();
  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const emoji = total >= 0 ? '💵' : '🔴';
  // Используем HTML формат для spoiler (замазанный текст)
  return `💼 Меню ${emoji} <b><spoiler>${total}</spoiler></b>`;
}

// Middleware для проверки пользователя
bot.use(async (ctx, next) => {
  if (ctx.from) {
    console.log(`[BOT] User ${ctx.from.id} (${ctx.from.username || 'no username'}) trying to access`);
    if (ctx.from.id !== ALLOWED_USER_ID) {
      console.log(`[BOT] Access denied for user ${ctx.from.id}`);
      return;
    }
    console.log(`[BOT] Access granted for user ${ctx.from.id}`);
  }
  await next();
});

// Команда /start и /menu для главного меню
bot.start(async (ctx) => {
  const menuText = await getMenuText();
  ctx.reply(menuText, { parse_mode: 'HTML', ...getMainMenu() });
});

bot.command('menu', async (ctx) => {
  const menuText = await getMenuText();
  ctx.reply(menuText, { parse_mode: 'HTML', ...getMainMenu() });
});

// Действие "Главное меню"
bot.action('main_menu', async (ctx) => {
  const menuText = await getMenuText();
  ctx.editMessageText(menuText, { parse_mode: 'HTML', ...getMainMenu() });
});

bot.action('create_account', async (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🏠 Меню', 'main_menu')]
  ]);
  ctx.editMessageText('✍️ Введите название нового счета:', keyboard);
  await setSession(ctx.from.id, { action: 'create_account' });
});

bot.action('list_accounts', async (ctx) => {
  const accounts = await getAccounts();
  if (accounts.length === 0) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('➕ Создать счет', 'create_account')],
      [Markup.button.callback('🏠 Меню', 'main_menu')]
    ]);
    ctx.editMessageText('📭 Нет счетов.', keyboard);
  } else {
    const text = '💼 Ваши счета:\n' + accounts.map(acc => {
      const balanceEmoji = acc.balance >= 0 ? '💵' : '🔴';
      return `${balanceEmoji} ${acc.name}: ${acc.balance}`;
    }).join('\n');
    const keyboard = accounts.map(acc => [Markup.button.callback(`✏️ Редактировать ${acc.name}`, `edit_${acc.id}`)]);
    keyboard.push([Markup.button.callback('🏠 Меню', 'main_menu')]);
    ctx.editMessageText(text, Markup.inlineKeyboard(keyboard));
  }
});

bot.action('add_transaction', async (ctx) => {
  const accounts = await getAccounts();
  if (accounts.length === 0) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('➕ Создать счет', 'create_account')],
      [Markup.button.callback('🏠 Меню', 'main_menu')]
    ]);
    ctx.editMessageText('⚠️ Сначала создайте счет.', keyboard);
  } else {
    const keyboard = accounts.map(acc => [Markup.button.callback(`💳 ${acc.name}`, `select_acc_${acc.id}`)]);
    keyboard.push([Markup.button.callback('🏠 Меню', 'main_menu')]);
    ctx.editMessageText('💳 Выберите счет для транзакции:', Markup.inlineKeyboard(keyboard));
    await setSession(ctx.from.id, { action: 'add_transaction' });
  }
});

bot.action('total_balance', async (ctx) => {
  const accounts = await getAccounts();
  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const emoji = total >= 0 ? '💵' : '🔴';
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🏠 Меню', 'main_menu')]
  ]);
  ctx.editMessageText(`${emoji} Общий баланс: ${total}`, keyboard);
});

bot.action(/^edit_(.+)$/, async (ctx) => {
  const accId = ctx.match[1];
  await setSession(ctx.from.id, { action: 'edit_account', editAccId: accId });
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🏠 Меню', 'main_menu')]
  ]);
  ctx.editMessageText('✍️ Введите новое название счета:', keyboard);
});

bot.action('back', async (ctx) => {
  const menuText = await getMenuText();
  ctx.editMessageText(menuText, { parse_mode: 'HTML', ...getMainMenu() });
});

bot.action(/^select_acc_(.+)$/, async (ctx) => {
  const accId = ctx.match[1];
  await setSession(ctx.from.id, { action: 'enter_transaction', selectedAcc: accId });
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🏠 Меню', 'main_menu')]
  ]);
  ctx.editMessageText('✍️ Введите сумму (положительная для прихода, отрицательная для расхода) и описание через пробел:', keyboard);
});

bot.on('text', async (ctx) => {
  const messageText = ctx.message.text;
  const textLower = messageText.toLowerCase().trim();
  
  // Обработка команды "меню" или "главное меню"
  if (textLower === 'меню' || textLower === 'menu' || textLower === 'главное меню' || textLower === 'начать') {
    const menuText = await getMenuText();
    ctx.reply(menuText, { parse_mode: 'HTML', ...getMainMenu() });
    return;
  }
  
  const session = await getSession(ctx.from.id);
  
  // Если нет активной сессии, показываем главное меню
  if (!session) {
    const menuText = await getMenuText();
    ctx.reply(menuText, { parse_mode: 'HTML', ...getMainMenu() });
    return;
  }
  
  const action = session.action;
  const text = messageText;

  if (action === 'create_account') {
    await createAccount(text);
    await deleteSession(ctx.from.id);
    ctx.reply(`✅ Счет '${text}' создан.`, getMainMenu());
  } else if (action === 'edit_account') {
    const accId = session.editAccId;
    await editAccount(accId, text);
    await deleteSession(ctx.from.id);
    ctx.reply(`✏️ Счет переименован в '${text}'.`, getMainMenu());
  } else if (action === 'enter_transaction') {
    try {
      const parts = text.split(' ', 2);
      const amount = parseFloat(parts[0]);
      const desc = parts[1] || '';
      const accId = session.selectedAcc;
      await addTransaction(accId, amount, desc);
      await deleteSession(ctx.from.id);
      const emoji = amount >= 0 ? '📈' : '📉';
      ctx.reply(`${emoji} Транзакция добавлена.`, getMainMenu());
    } catch (e) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Главное меню', 'main_menu')]
      ]);
      ctx.reply('❌ Неверный формат. Введите число и описание.\n\nПример: 1000 Покупка продуктов', keyboard);
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
    console.log(`[DATA] Данные загружены: ${Object.keys(parsed.accounts).length} счетов, ${parsed.transactions.length} транзакций`);
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('[DATA] Файл данных не найден, создаю новый');
      return { accounts: {}, transactions: [], sessions: {} };
    }
    console.error('[DATA] Ошибка загрузки данных:', error);
    throw error;
  }
}

async function saveData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[DATA] Данные сохранены: ${Object.keys(data.accounts).length} счетов, ${data.transactions.length} транзакций`);
  } catch (error) {
    console.error('[DATA] Ошибка сохранения данных:', error);
    throw error;
  }
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
    const updateType = update?.message ? 'message' : 
                      update?.callback_query ? 'callback_query' : 
                      update?.edited_message ? 'edited_message' : 'unknown';
    
    console.log(`[WEBHOOK] Received update #${update?.update_id}, type: ${updateType}`);
    
    if (update?.message) {
      console.log(`[WEBHOOK] Message from ${update.message.from?.id}: ${update.message.text || '(no text)'}`);
    }
    
    if (update?.callback_query) {
      console.log(`[WEBHOOK] Callback from ${update.callback_query.from?.id}: ${update.callback_query.data}`);
    }
    
    // Обрабатываем обновление с таймаутом
    await Promise.race([
      bot.handleUpdate(update),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Update handling timeout')), 10000)
      )
    ]);
    
    console.log(`[WEBHOOK] Update #${update?.update_id} processed successfully`);
    res.status(200).send('OK');
  } catch (error) {
    console.error('[WEBHOOK] Error handling update:', error);
    console.error('[WEBHOOK] Error stack:', error.stack);
    console.error('[WEBHOOK] Update body:', JSON.stringify(req.body, null, 2));
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

