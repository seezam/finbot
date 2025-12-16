#!/bin/bash

# Скрипт для проверки и настройки webhook
# Использование: ./check-webhook.sh <RAILWAY_URL>

# Загружаем токен из переменной окружения или .env файла
if [ -z "$BOT_TOKEN" ]; then
  if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
  else
    echo "ОШИБКА: BOT_TOKEN не установлен!"
    echo "Установите переменную окружения: export BOT_TOKEN=your_token"
    echo "Или создайте .env файл с BOT_TOKEN=your_token"
    exit 1
  fi
fi

if [ -z "$1" ]; then
  echo "Использование: ./check-webhook.sh <RAILWAY_URL>"
  echo "Пример: ./check-webhook.sh https://finbot-production.up.railway.app"
  echo ""
  echo "Текущий webhook:"
  curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool
  exit 1
fi

RAILWAY_URL=$1
WEBHOOK_URL="${RAILWAY_URL}/webhook"

echo "Проверяю доступность сервера..."
curl -s "${RAILWAY_URL}/health" && echo "" || echo "Сервер недоступен!"

echo ""
echo "Удаляю старый webhook..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"

echo ""
echo "Настраиваю новый webhook: ${WEBHOOK_URL}"
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}"

echo ""
echo ""
echo "Проверка webhook:"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool

echo ""
echo "Готово! Попробуйте отправить /start боту."

