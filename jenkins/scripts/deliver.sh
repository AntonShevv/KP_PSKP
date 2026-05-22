#!/bin/bash
# jenkins/scripts/deliver.sh

echo "========================================="
echo "🚀 Деплой QuizMaster"
echo "========================================="

# Остановка старых контейнеров
echo "🛑 Остановка старых контейнеров..."
docker-compose down

# Запуск новых контейнеров
echo "🐳 Запуск новых контейнеров..."
docker-compose up -d --build

# Очистка неиспользуемых образов
echo "🧹 Очистка Docker..."
docker system prune -f

echo "✅ Деплой завершён!"
echo "🔗 Приложение доступно по адресу: https://localhost"