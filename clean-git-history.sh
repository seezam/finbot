#!/bin/bash

# Скрипт для очистки истории Git от скомпрометированного токена
# ВНИМАНИЕ: Это перезапишет историю Git! Используйте с осторожностью!

OLD_TOKEN="REDACTED_TELEGRAM_BOT_TOKEN"
REPLACEMENT="YOUR_BOT_TOKEN_HERE"

echo "⚠️  ВНИМАНИЕ: Этот скрипт перезапишет историю Git!"
echo "Убедитесь, что:"
echo "1. Вы сделали backup репозитория"
echo "2. Все участники проекта знают о force push"
echo "3. Вы отозвали старый токен через BotFather"
echo ""
read -p "Продолжить? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Отменено."
  exit 1
fi

# Проверяем наличие git-filter-repo
if ! command -v git-filter-repo &> /dev/null; then
  echo "Установка git-filter-repo..."
  pip install git-filter-repo || {
    echo "Ошибка: не удалось установить git-filter-repo"
    echo "Установите вручную: pip install git-filter-repo"
    exit 1
  }
fi

echo "Очистка истории от токена..."
git filter-repo --replace-text <(echo "${OLD_TOKEN}==>${REPLACEMENT}")

echo ""
echo "✅ История очищена!"
echo ""
echo "⚠️  Теперь нужно сделать force push:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "После этого все участники должны выполнить:"
echo "   git fetch origin"
echo "   git reset --hard origin/master"

