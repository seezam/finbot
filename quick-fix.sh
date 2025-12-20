#!/bin/bash

# Быстрый скрипт для перезапуска webhook и проверки бота
# Использование: ./quick-fix.sh

BOT_TOKEN="${BOT_TOKEN:-}"
RAILWAY_URL="${RAILWAY_URL:-https://finbot-production-19c7.up.railway.app}"

# Загружаем токен из .env если не установлен
if [ -z "$BOT_TOKEN" ]; then
  if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
  else
    echo "❌ ОШИБКА: BOT_TOKEN не установлен!"
    echo "Установите: export BOT_TOKEN=your_token"
    exit 1
  fi
fi

echo "🔍 Проверка сервера..."
SERVER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${RAILWAY_URL}/health")
if [ "$SERVER_STATUS" = "200" ]; then
  echo "✅ Сервер работает (HTTP $SERVER_STATUS)"
else
  echo "⚠️  Сервер недоступен (HTTP $SERVER_STATUS)"
  echo "   Возможно, Railway перезапускает приложение..."
  echo "   Подождите 1-2 минуты и попробуйте снова"
  echo ""
  echo "   Или проверьте логи на Railway:"
  echo "   https://railway.app → ваш проект → Deployments → View Logs"
fi

echo ""
echo "🔄 Перезапуск webhook..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" > /dev/null
sleep 1
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${RAILWAY_URL}/webhook" > /dev/null

echo ""
echo "📊 Статус webhook:"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool

echo ""
if [ "$SERVER_STATUS" = "200" ]; then
  echo "✅ Готово! Попробуйте отправить /start боту."
else
  echo "⚠️  Webhook настроен, но сервер недоступен."
  echo "   Подождите 1-2 минуты, пока Railway перезапустит приложение."
fi

