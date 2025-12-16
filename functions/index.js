const { Telegraf, Markup } = require('telegraf');

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

bot.action('create_account', async (ctx) => {
  ctx.editMessageText('Введите название нового счета:');
  await setSession(ctx.from.id, { action: 'create_account' }, ctx.env.KV);
});

bot.action('list_accounts', async (ctx) => {
  const accounts = await getAccounts(ctx.env.KV);
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
  const accounts = await getAccounts(ctx.env.KV);
  if (accounts.length === 0) {
    ctx.editMessageText('Сначала создайте счет.');
  } else {
    const keyboard = accounts.map(acc => [Markup.button.callback(acc.name, `select_acc_${acc.id}`)]);
    ctx.editMessageText('Выберите счет для транзакции:', Markup.inlineKeyboard(keyboard));
    await setSession(ctx.from.id, { action: 'add_transaction' }, ctx.env.KV);
  }
});

bot.action('total_balance', async (ctx) => {
  const accounts = await getAccounts(ctx.env.KV);
  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  ctx.editMessageText(`Общий баланс: ${total}`);
});

bot.action(/^edit_(.+)$/, async (ctx) => {
  const accId = ctx.match[1];
  await setSession(ctx.from.id, { action: 'edit_account', editAccId: accId }, ctx.env.KV);
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
  await setSession(ctx.from.id, { action: 'enter_transaction', selectedAcc: accId }, ctx.env.KV);
  ctx.editMessageText('Введите сумму (положительная для прихода, отрицательная для расхода) и описание через пробел:');
});

bot.on('text', async (ctx) => {
  const session = await getSession(ctx.from.id, ctx.env.KV);
  if (!session) return;
  const action = session.action;
  const text = ctx.message.text;

  if (action === 'create_account') {
    await createAccount(text, ctx.env.KV);
    ctx.reply(`Счет '${text}' создан.`);
    await deleteSession(ctx.from.id, ctx.env.KV);
  } else if (action === 'edit_account') {
    const accId = session.editAccId;
    await editAccount(accId, text, ctx.env.KV);
    ctx.reply(`Счет переименован в '${text}'.`);
    await deleteSession(ctx.from.id, ctx.env.KV);
  } else if (action === 'enter_transaction') {
    try {
      const parts = text.split(' ', 2);
      const amount = parseFloat(parts[0]);
      const desc = parts[1] || '';
      const accId = session.selectedAcc;
      await addTransaction(accId, amount, desc, ctx.env.KV);
      ctx.reply('Транзакция добавлена.');
      await deleteSession(ctx.from.id, ctx.env.KV);
    } catch (e) {
      ctx.reply('Неверный формат. Введите число и описание.');
    }
  }
});

async function getAccounts(kv) {
  const data = await loadData(kv);
  return Object.entries(data.accounts).map(([id, acc]) => ({ id, ...acc }));
}

async function createAccount(name, kv) {
  const data = await loadData(kv);
  const id = Date.now().toString();
  data.accounts[id] = { name, balance: 0 };
  await saveData(data, kv);
}

async function editAccount(id, newName, kv) {
  const data = await loadData(kv);
  if (data.accounts[id]) {
    data.accounts[id].name = newName;
    await saveData(data, kv);
  }
}

async function addTransaction(accId, amount, desc, kv) {
  const data = await loadData(kv);
  const trans = { accountId: accId, amount, description: desc, date: new Date() };
  data.transactions.push(trans);
  if (data.accounts[accId]) {
    data.accounts[accId].balance += amount;
  }
  await saveData(data, kv);
}

async function loadData(kv) {
  try {
    const value = await kv.get('data');
    return value ? JSON.parse(value) : { accounts: {}, transactions: [] };
  } catch {
    return { accounts: {}, transactions: [] };
  }
}

async function saveData(data, kv) {
  await kv.put('data', JSON.stringify(data));
}

async function getSession(userId, kv) {
  const value = await kv.get(`session_${userId}`);
  return value ? JSON.parse(value) : null;
}

async function setSession(userId, session, kv) {
  await kv.put(`session_${userId}`, JSON.stringify(session));
}

async function deleteSession(userId, kv) {
  await kv.delete(`session_${userId}`);
}

export default {
  async fetch(request, env) {
    if (request.method === 'POST') {
      const update = await request.json();
      await bot.handleUpdate(update);
      return new Response('OK');
    }
    return new Response('Method not allowed', { status: 405 });
  }
};