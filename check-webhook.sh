#!/bin/bash

# Скрипт для проверки и настройки webhook
# Использование: ./check-webhook.sh <RAILWAY_URL>

BOT_TOKEN="REDACTED_TELEGRAM_BOT_TOKEN"

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

