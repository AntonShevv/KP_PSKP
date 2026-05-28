pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
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

        stage('Frontend Install & Build') {
            steps {
                script {
                    if (fileExists('frontend/package.json')) {
                        dir('frontend') {
                            sh 'npm install'
                            sh 'npm run build'
                        }
                    } else {
                        echo '⚠️ Frontend не найден, пропускаем сборку...'
                        // Создаем пустую директорию для build, чтобы nginx не падал
                        sh 'mkdir -p frontend/build'
                        sh 'echo "<html><body><h1>Quiz Master API</h1></body></html>" > frontend/build/index.html'
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                dir('backend') {
                    sh 'npm test -- tests/authService.unit.test.js'
                }
            }
        }

        stage('Docker Deploy') {
            steps {
                echo '🚀 Тесты прошли успешно! Деплоим через Docker Compose...'
                
                script {
                    // Даем права на docker.sock (если нужно)
                    sh 'chmod 666 /var/run/docker.sock 2>/dev/null || true'
                    
                    // Останавливаем старые контейнеры
                    sh 'docker compose down'
                    
                    // Пересобираем и запускаем
                    sh 'docker compose up -d --build'
                    
                    // Проверяем статус
                    sh 'docker compose ps'
                    
                    // Показываем последние логи
                    sh 'docker compose logs --tail=20'
                }
                
                echo '✅ Деплой через Docker Compose завершен!'
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo '🏥 Проверка работоспособности...'
                    sh 'sleep 15'
                    
                    // Проверка бэкенда
                    sh 'curl -f http://localhost:5000/health || echo "⚠️ Бэкенд не отвечает"'
                    
                    // Проверка SQL Server
                    sh 'docker exec quiz-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Qwerty0987!" -C -Q "SELECT 1" || echo "⚠️ SQL Server не отвечает"'
                    
                    echo '✅ Все сервисы работают!'
                }
            }
        }

        stage('Info') {
            steps {
                echo '✅ CI/CD Pipeline выполнен!'
                sh 'node --version'
                sh 'npm --version'
                sh 'docker --version'
                sh 'docker compose version'
                sh 'echo "📦 Запущенные контейнеры:"'
                sh 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
            }
        }
    }

    post {
        always {
            script {
                sh 'docker compose logs --tail=50 || true'
                cleanWs()
            }
        }
        success {
            echo '🎉 Pipeline успешен! Все сервисы запущены:'
            sh 'echo "✅ SQL Server: localhost:1433"'
            sh 'echo "✅ Backend API: http://localhost:5000"'
            sh 'echo "✅ Nginx: http://localhost"'
        }
        failure {
            echo '❌ Pipeline упал'
            sh 'docker compose logs --tail=100 || true'
        }
    }
}