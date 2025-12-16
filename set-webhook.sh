#!/bin/bash

# Скрипт для настройки webhook Telegram бота
# Использование: ./set-webhook.sh <BOT_TOKEN> <WEBHOOK_URL>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Использование: ./set-webhook.sh <BOT_TOKEN> <WEBHOOK_URL>"
  echo "Пример: ./set-webhook.sh 123456:ABC-DEF /webhook https://your-app.railway.app/webhook"
  exit 1
fi

BOT_TOKEN=$1
WEBHOOK_URL=$2

echo "Настройка webhook для бота..."
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}"

echo ""
echo "Проверка webhook..."
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"

