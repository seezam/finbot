# Создание публичного домена в Railway

## Через интерфейс Railway:

1. В разделе **"Public Networking"** должна быть кнопка:
   - **"Generate Domain"** или
   - **"Create Public Domain"** или
   - **"Enable Public Networking"** или
   - Переключатель/чекбокс для включения публичного доступа

2. Нажмите на эту кнопку/переключатель

3. Railway автоматически создаст домен вида: `your-app-name.up.railway.app`

4. Скопируйте этот URL

## Через Railway CLI (проще):

```bash
# Установите Railway CLI
npm i -g @railway/cli

# Войдите
railway login

# Перейдите в папку проекта
cd /home/al/dev/finbot

# Подключите проект (если еще не подключен)
railway link

# Создайте публичный домен
railway domain

# Или получите существующий домен
railway domain
```

## Альтернатива - проверить переменные окружения:

В Railway:
1. Settings → Variables
2. Найдите переменную `RAILWAY_PUBLIC_DOMAIN` или `RAILWAY_STATIC_URL`
3. Если её нет, Railway может использовать другой формат

## Если ничего не помогает:

Попробуйте проверить логи последнего деплоя - там может быть показан URL, который Railway пытается использовать.

