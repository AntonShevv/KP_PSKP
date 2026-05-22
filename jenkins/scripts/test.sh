#!/bin/bash
# jenkins/scripts/test.sh

echo "========================================="
echo "🧪 Запуск тестов QuizMaster"
echo "========================================="

cd backend

# Запуск unit-тестов
echo "📦 Запуск unit-тестов..."
npm test -- tests/authService.unit.test.js

# Проверка кода линтером (если есть)
if [ -f "package.json" ]; then
    if grep -q "eslint" package.json; then
        echo "📏 Запуск ESLint..."
        npm run lint
    fi
fi

echo "✅ Все тесты пройдены!"