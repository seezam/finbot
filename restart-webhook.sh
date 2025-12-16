#!/bin/bash

# Скрипт для перезапуска webhook (если бот перестал отвечать)
# Использование: ./restart-webhook.sh

BOT_TOKEN="REDACTED_TELEGRAM_BOT_TOKEN"
RAILWAY_URL="https://finbot-production-19c7.up.railway.app"

echo "Проверяю доступность сервера..."
if ! curl -s "${RAILWAY_URL}/health" > /dev/null; then
  echo "ОШИБКА: Сервер недоступен!"
  exit 1
fi

echo "Сервер доступен ✓"
echo ""

echo "Проверяю текущий webhook..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool

echo ""
echo "Переустанавливаю webhook..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"
sleep 1
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${RAILWAY_URL}/webhook"

echo ""
echo ""
echo "Финальная проверка:"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool

echo ""
echo "Готово! Попробуйте отправить /start боту."

