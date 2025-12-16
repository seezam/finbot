const { Telegraf, Markup } = require('telegraf');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

const sessions = new Map();

async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { accounts: {}, transactions: [] };
  }
}

async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

const BOT_TOKEN = 'REDACTED_TELEGRAM_BOT_TOKEN';
const ALLOWED_USER_ID = 7186109787;

const bot = new Telegraf(BOT_TOKEN);

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

bot.action('create_account', (ctx) => {
  ctx.editMessageText('Введите название нового счета:');
  sessions.set(ctx.from.id, { action: 'create_account' });
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
    sessions.set(ctx.from.id, { action: 'add_transaction' });
  }
});

bot.action('total_balance', async (ctx) => {
  const accounts = await getAccounts();
  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  ctx.editMessageText(`Общий баланс: ${total}`);
});

bot.action(/^edit_(.+)$/, (ctx) => {
  const accId = ctx.match[1];
  sessions.set(ctx.from.id, { action: 'edit_account', editAccId: accId });
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

bot.action(/^select_acc_(.+)$/, (ctx) => {
  const accId = ctx.match[1];
  sessions.set(ctx.from.id, { action: 'enter_transaction', selectedAcc: accId });
  ctx.editMessageText('Введите сумму (положительная для прихода, отрицательная для расхода) и описание через пробел:');
});

bot.on('text', async (ctx) => {
  const session = sessions.get(ctx.from.id);
  if (!session) return;
  const action = session.action;
  const text = ctx.message.text;

  if (action === 'create_account') {
    await createAccount(text);
    ctx.reply(`Счет '${text}' создан.`);
    sessions.delete(ctx.from.id);
  } else if (action === 'edit_account') {
    const accId = session.editAccId;
    await editAccount(accId, text);
    ctx.reply(`Счет переименован в '${text}'.`);
    sessions.delete(ctx.from.id);
  } else if (action === 'enter_transaction') {
    try {
      const parts = text.split(' ', 2);
      const amount = parseFloat(parts[0]);
      const desc = parts[1] || '';
      const accId = session.selectedAcc;
      await addTransaction(accId, amount, desc);
      ctx.reply('Транзакция добавлена.');
      sessions.delete(ctx.from.id);
    } catch (e) {
      ctx.reply('Неверный формат. Введите число и описание.');
    }
  }
});

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
  const trans = { accountId: accId, amount, description: desc, date: new Date() };
  data.transactions.push(trans);
  if (data.accounts[accId]) {
    data.accounts[accId].balance += amount;
  }
  await saveData(data);
}

bot.launch();