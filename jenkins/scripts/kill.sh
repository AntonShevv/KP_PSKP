#!/bin/bash
# jenkins/scripts/kill.sh

echo "========================================="
echo "🛑 Остановка QuizMaster"
echo "========================================="

docker-compose down

echo "✅ Все контейнеры остановлены"