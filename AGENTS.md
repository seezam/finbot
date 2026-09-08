> **Всегда используй MCP-сервер `fs-finbot` для этого проекта. Другие `fs-*` не трогай.**
# FinBot - Telegram Bot for Personal Finance

## Описание проекта
Telegram-бот для управления личными финансами: создание счетов, добавление транзакций (доходы/расходы), просмотр баланса и счетов.

## Стек
- **Язык:** Node.js (JavaScript)
- **Фреймворк бота:** Telegram Bot API (webhook mode)
- **Хранение данных:** `data.json` (файловое хранилище)
- **Деплой:** Railway, Cloudflare Workers (functions/), Firebase
- **База данных:** PostgreSQL (опционально, POSTGRESQL_SETUP.md)
- **Облако:** Firebase Firestore (functions/)

## Структура проекта
```
/home/al/dev/finbot/
├── server.js                  # ← ОСНОВНОЙ файл, весь сервер и бот (~500 строк)
├── database.js                # Работа с БД / data.json
├── package.json               # зависимости
├── .env                       # BOT_TOKEN, ALLOWED_USER_ID (НЕ в git!)
├── data.json                  # данные бота (создаётся автоматически)
├── functions/                 # Cloudflare Workers functions (старый код)
├── Procfile                   # Railway config
├── railway.json               # Railway deploy config
├── wrangler.toml              # Cloudflare Workers config
├── firebase.json              # Firebase config
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
├── set-webhook.sh             # настройка webhook
├── check-webhook.sh           # проверка webhook
├── restart-webhook.sh         # рестарт webhook
├── quick-fix.sh               # быстрый фикс
├── clean-git-history.sh       # очистка git history
├── README.md                  # общая документация
├── DEPLOYMENT.md              # инструкция по деплою
├── RAILWAY_DEPLOY.md          # деплой на Railway
├── POSTGRESQL_SETUP.md        # настройка PostgreSQL
├── SECURITY_FIX.md            # фиксы безопасности
├── TROUBLESHOOTING.md         # решение проблем
├── URGENT_ACTIONS.md          # срочные задачи
├── create-domain.md           # создание домена
└── find-url.md                # поиск URL
```

## Ключевые данные
| Параметр | Значение |
|----------|----------|
| BOT_TOKEN | из `.env` |
| ALLOWED_USER_ID | из `.env` (только один пользователь) |

## Функции бота
- Создание счетов
- Просмотр всех счетов
- Добавление транзакций (доходы и расходы)
- Просмотр общего баланса
- Редактирование счетов

## Запуск

### Локально
```bash
cd /home/al/dev/finbot
npm install
# создай .env на основе .env.example
npm start
# настрой webhook:
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://YOUR_DOMAIN/webhook"
```

### Деплой на Railway
```bash
# 1. Загрузи в GitHub
# 2. Railway → Deploy from GitHub
# 3. Добавь env vars: BOT_TOKEN, ALLOWED_USER_ID
# 4. После деплоя настрой webhook:
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-app.railway.app/webhook"
```

## Деплой
- **Railway:** Procfile + railway.json
- **Cloudflare Workers:** functions/ + wrangler.toml
- **Firebase:** firebase.json + firestore.rules (functions/)

## Важные файлы
- `server.js` — основной файл, вся логика бота и сервера
- `database.js` — работа с хранилищем данных
- `.env` — **НЕ коммитить!** BOT_TOKEN и ALLOWED_USER_ID
- `data.json` — данные бота (создаётся автоматически)

## Ограничения
- Данные хранятся в файле `data.json` (не надёжно для продакшена)
- Работает только для одного пользователя (`ALLOWED_USER_ID`)
- Для продакшена рекомендуется PostgreSQL (см. POSTGRESQL_SETUP.md)

## Правила работы
- Перед правками сначала читай `server.js` — там вся логика
- `.env` не трогать без явного разрешения
- В конце сессии обновляй этот файл по запросу
- Кратко фиксируй решения и грабли
