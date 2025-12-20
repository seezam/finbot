const { Pool } = require('pg');

// Подключение к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

// Инициализация схемы БД
async function initDatabase() {
  try {
    // Таблица счетов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        balance DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица транзакций
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        account_id VARCHAR(255) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        description TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);

    // Таблица сессий
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        user_id BIGINT PRIMARY KEY,
        session_data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Индексы для производительности
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    `);

    console.log('[DB] База данных инициализирована');
  } catch (error) {
    console.error('[DB] Ошибка инициализации БД:', error);
    throw error;
  }
}

// Получить все счета
async function getAccounts() {
  try {
    const result = await pool.query('SELECT id, name, balance FROM accounts ORDER BY created_at');
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      balance: parseFloat(row.balance)
    }));
  } catch (error) {
    console.error('[DB] Ошибка получения счетов:', error);
    throw error;
  }
}

// Создать счет
async function createAccount(id, name) {
  try {
    await pool.query(
      'INSERT INTO accounts (id, name, balance) VALUES ($1, $2, 0)',
      [id, name]
    );
    console.log(`[DB] Счет создан: ${name} (${id})`);
  } catch (error) {
    console.error('[DB] Ошибка создания счета:', error);
    throw error;
  }
}

// Редактировать счет
async function editAccount(id, newName) {
  try {
    await pool.query(
      'UPDATE accounts SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newName, id]
    );
    console.log(`[DB] Счет обновлен: ${id} -> ${newName}`);
  } catch (error) {
    console.error('[DB] Ошибка редактирования счета:', error);
    throw error;
  }
}

// Добавить транзакцию
async function addTransaction(accountId, amount, description) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Добавляем транзакцию
    await client.query(
      'INSERT INTO transactions (account_id, amount, description) VALUES ($1, $2, $3)',
      [accountId, amount, description || null]
    );
    
    // Обновляем баланс счета
    await client.query(
      'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, accountId]
    );
    
    await client.query('COMMIT');
    console.log(`[DB] Транзакция добавлена: ${accountId}, сумма: ${amount}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB] Ошибка добавления транзакции:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Получить сессию пользователя
async function getSession(userId) {
  try {
    const result = await pool.query(
      'SELECT session_data FROM sessions WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length > 0) {
      // session_data хранится как JSONB, но может быть строкой
      const sessionData = result.rows[0].session_data;
      return typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    }
    return null;
  } catch (error) {
    console.error('[DB] Ошибка получения сессии:', error);
    throw error;
  }
}

// Установить сессию пользователя
async function setSession(userId, session) {
  try {
    await pool.query(
      `INSERT INTO sessions (user_id, session_data) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id) 
       DO UPDATE SET session_data = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(session)]
    );
  } catch (error) {
    console.error('[DB] Ошибка сохранения сессии:', error);
    throw error;
  }
}

// Удалить сессию пользователя
async function deleteSession(userId) {
  try {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  } catch (error) {
    console.error('[DB] Ошибка удаления сессии:', error);
    throw error;
  }
}

// Закрыть соединение с БД
async function closeDatabase() {
  await pool.end();
}

module.exports = {
  initDatabase,
  getAccounts,
  createAccount,
  editAccount,
  addTransaction,
  getSession,
  setSession,
  deleteSession,
  closeDatabase
};

