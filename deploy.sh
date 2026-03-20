#!/bin/bash

echo "🚀 Деплоим конвертер валют на GitHub..."

# Переходим в папку проекта
cd "$(dirname "$0")" || exit

# Проверяем git статус
if [ ! -d ".git" ]; then
    echo "🔧 Инициализируем git..."
    git init
fi

# Настраиваем пользователя (замени на свои данные)
git config user.name "Jack Dzmitrevich"
git config user.email "твой@email.com"

# Добавляем remote (замени на свой репозиторий)
REPO_URL="https://github.com/jdmephisto-art/valutabot.git"
git remote add origin $REPO_URL 2>/dev/null || git remote set-url origin $REPO_URL

# Добавляем все файлы
echo "📁 Добавляем файлы..."
git add .

# Коммитим
echo "💾 Создаём коммит..."
git commit -m "Initial commit: Currency converter app $(date)" || echo "Ничего нового для коммита"

# Устанавливаем main ветку и пушим
echo "📤 Пушим на GitHub..."
git branch -M main
git push -u origin main --force

echo "✅ Деплой завершён! Проверь https://github.com/jdmephisto-art/valutabot"
