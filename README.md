# FinBot - Telegram бот для управления личными финансами

Бот для управления личными финансами через Telegram.

## Локальная разработка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Заполните переменные окружения в `.env`:
- `BOT_TOKEN` - токен вашего Telegram бота (получите у @BotFather)
- `ALLOWED_USER_ID` - ваш Telegram User ID (можно узнать у @userinfobot)

4. Запустите сервер:
```bash
npm start
```

5. Настройте webhook для Telegram (замените `YOUR_DOMAIN` на ваш домен):
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://YOUR_DOMAIN/webhook"
```

## Развертывание на Railway

### Способ 1: Через GitHub

1. Загрузите код в GitHub репозиторий

2. Перейдите на [Railway](https://railway.app) и создайте новый проект

3. Выберите "Deploy from GitHub repo" и подключите ваш репозиторий

4. Railway автоматически определит проект как Node.js и начнет сборку

5. Добавьте переменные окружения в Railway:
   - `BOT_TOKEN` - токен вашего Telegram бота
   - `ALLOWED_USER_ID` - ваш Telegram User ID
   - `PORT` - Railway установит автоматически, но можно оставить пустым

6. После успешного деплоя, Railway предоставит вам URL (например: `https://your-app.railway.app`)

7. Настройте webhook для Telegram:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-app.railway.app/webhook"
```

### Способ 2: Через Railway CLI

1. Установите Railway CLI:
```bash
npm i -g @railway/cli
```

2. Войдите в Railway:
```bash
railway login
```

3. Инициализируйте проект:
```bash
railway init
```

4. Добавьте переменные окружения:
```bash
railway variables set BOT_TOKEN=your_token_here
railway variables set ALLOWED_USER_ID=your_user_id_here
```

5. Задеплойте:
```bash
railway up
```

6. Получите URL вашего приложения:
```bash
railway domain
```

7. Настройте webhook (см. выше)

## Структура проекта

- `server.js` - основной файл сервера
- `package.json` - зависимости и скрипты
- `Procfile` - конфигурация для Railway
- `data.json` - файл с данными (создается автоматически)
- `functions/` - старый код для Cloudflare Workers (можно удалить)

## Функции бота

- Создание счетов
- Просмотр всех счетов
- Добавление транзакций (доходы и расходы)
- Просмотр общего баланса
- Редактирование счетов

## Примечания

- Данные хранятся в файле `data.json` (в продакшене на Railway используйте базу данных для надежности)
- Бот работает только для пользователя с указанным `ALLOWED_USER_ID`
- Для продакшена рекомендуется использовать базу данных вместо файлового хранилища

