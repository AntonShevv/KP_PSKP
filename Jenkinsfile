pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    environment {
        DOCKER_COMPOSE_VERSION = '2.23.0'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Install') {
            steps {
                dir('backend') {
                    sh 'npm install'
                }
            }
        }

        stage('Frontend Install') {
            steps {
                script {
                    if (fileExists('frontend/package.json')) {
                        dir('frontend') {
                            sh 'npm install'
                        }
                    } else {
                        echo '⚠️ Frontend не найден, пропускаем...'
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                script {
                    dir('backend') {
                        try {
                            sh 'npm test -- tests/authService.unit.test.js'
                        } catch (Exception e) {
                            error('❌ Тесты не прошли! Деплой отменен.')
                        }
                    }
                }
            }
        }

        stage('Docker Deploy') {
            steps {
                echo '🚀 Тесты прошли успешно! Деплоим через Docker Compose...'
                
                script {
                    // Остановка старых контейнеров (опционально)
                    sh 'docker-compose down'
                    
                    // Пересборка образов без кэша (для чистого деплоя)
                    sh 'docker-compose build --no-cache'
                    
                    // Запуск контейнеров в фоновом режиме
                    sh 'docker-compose up -d'
                    
                    // Проверка статуса контейнеров
                    sh 'docker-compose ps'
                    
                    // Очистка неиспользуемых образов (опционально)
                    sh 'docker system prune -f'
                }
                
                echo '✅ Деплой через Docker Compose завершен!'
            }
        }

        stage('Health Check') {
            when {
                expression { env.TESTS_PASSED == 'true' }
            }
            steps {
                script {
                    echo '🏥 Проверка работоспособности...'
                    // Пауза для запуска сервисов
                    sh 'sleep 5'
                    
                    // Проверка бэкенда (замените порт на ваш)
                    sh 'curl -f http://localhost:3000/health || echo "⚠️ Бэкенд не отвечает"'
                    
                    // Проверка фронтенда (замените порт на ваш)
                    sh 'curl -f http://localhost:80 || echo "⚠️ Фронтенд не отвечает"'
                }
            }
        }

        stage('Hello World') {
            steps {
                echo '✅ CI/CD Pipeline работает!'
                sh 'node --version'
                sh 'npm --version'
                sh 'docker --version'
                sh 'docker-compose --version'
            }
        }
    }

    post {
        always {
            script {
                // Логи для дебага
                sh 'docker-compose logs --tail=50 || true'
                cleanWs()
            }
        }
        success {
            echo '🎉 Pipeline успешен! Сервисы запущены через Docker Compose'
        }
        failure {
            echo '❌ Pipeline упал на этапе: ${env.STAGE_NAME}'
            // При падении можно остановить контейнеры
            sh 'docker-compose down || true'
        }
    }
}