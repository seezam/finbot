# Инструкция по развертыванию на Railway

## Быстрый старт

1. Перейдите на https://railway.app и войдите через GitHub

2. Нажмите "New Project" → "Deploy from GitHub repo"

3. Выберите репозиторий: `seezam/finbot`

4. Railway автоматически определит проект и начнет сборку

5. После успешного деплоя, перейдите в Settings → Variables и добавьте:

   ```
   BOT_TOKEN = REDACTED_TELEGRAM_BOT_TOKEN
   ALLOWED_USER_ID = 7186109787
   ```

6. Railway автоматически перезапустит приложение после добавления переменных

7. Получите URL вашего приложения:
   - Перейдите в Settings → Domains
   - Railway автоматически создаст домен вида: `your-app-name.railway.app`
   - Или создайте свой кастомный домен

8. Настройте webhook для Telegram:
   ```bash
   curl -X POST "https://api.telegram.org/botREDACTED_TELEGRAM_BOT_TOKEN/setWebhook?url=https://YOUR-RAILWAY-URL.railway.app/webhook"
   ```
   
   Замените `YOUR-RAILWAY-URL` на ваш реальный URL от Railway

9. Проверьте, что webhook установлен:
   ```bash
   curl "https://api.telegram.org/botREDACTED_TELEGRAM_BOT_TOKEN/getWebhookInfo"
   ```

10. Готово! Бот должен работать. Отправьте `/start` боту в Telegram.

## Проверка работы

- Health check: `https://YOUR-RAILWAY-URL.railway.app/health`
- Должен вернуть: `{"status":"ok"}`

## Логи

В Railway можно посмотреть логи в реальном времени в разделе "Deployments" → выберите последний деплой → "View Logs"

## Важно

- Не коммитьте `.env` файл в git (он уже в .gitignore)
- Токен бота и User ID должны быть только в переменных окружения Railway
- После изменения переменных окружения Railway автоматически перезапустит приложение

