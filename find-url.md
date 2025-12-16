# Как найти URL вашего приложения на Railway

## Способ 1: Через интерфейс Railway

1. Откройте ваш проект на https://railway.app
2. Нажмите на ваш сервис (service)
3. Перейдите во вкладку **"Settings"**
4. Найдите раздел **"Networking"** или **"Public Networking"**
5. Если там есть URL - скопируйте его
6. Если URL нет - нажмите кнопку **"Generate Domain"** или **"Create Public Domain"**

## Способ 2: Через Railway CLI

```bash
# Установите Railway CLI (если еще не установлен)
npm i -g @railway/cli

# Войдите в Railway
railway login

# Перейдите в папку проекта
cd /home/al/dev/finbot

# Подключите проект к Railway
railway link

# Получите URL
railway domain
```

## Способ 3: В логах деплоя

1. Откройте ваш проект на Railway
2. Перейдите в раздел **"Deployments"**
3. Откройте последний успешный деплой
4. Нажмите **"View Logs"**
5. В логах может быть показан URL приложения

## Способ 4: Проверка через переменные окружения

Railway автоматически создает переменную `RAILWAY_PUBLIC_DOMAIN`. Вы можете проверить её в:
- Settings → Variables

## После получения URL

Когда получите URL (например: `https://finbot-production.up.railway.app`), настройте webhook:

```bash
./check-webhook.sh https://ВАШ-URL.railway.app
```

Или вручную:
```bash
curl -X POST "https://api.telegram.org/botREDACTED_TELEGRAM_BOT_TOKEN/setWebhook?url=https://ВАШ-URL.railway.app/webhook"
```

