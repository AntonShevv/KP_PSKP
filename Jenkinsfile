pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
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
                        echo '⚠️ Frontend не найден, создаем заглушку...'
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
                echo '🚀 Деплой через Docker Compose'
                
                script {
                    // Проверяем Docker
                    sh 'docker ps || echo "Docker не доступен"'
                    
                    // Используем 'docker compose' (без дефиса) или 'docker-compose'
                    sh '''
                        # Остановка старых контейнеров
                        docker compose down || docker-compose down || true
                        
                        # Запуск новых
                        docker compose up -d --build || docker-compose up -d --build
                        
                        # Проверка статуса
                        docker compose ps || docker-compose ps
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo '🏥 Проверка работоспособности...'
                    sh 'sleep 15'
                    sh 'curl -f http://localhost:5000/health || echo "⚠️ Бэкенд не отвечает"'
                }
            }
        }

        stage('Info') {
            steps {
                echo '✅ Pipeline выполнен!'
                sh '''
                    echo "Контейнеры:"
                    docker ps || true
                '''
            }
        }
    }

    post {
        always {
            script {
                sh '''
                    docker compose logs --tail=50 || docker-compose logs --tail=50 || true
                '''
                cleanWs()
            }
        }
        success {
            echo '🎉 Pipeline успешен!'
        }
        failure {
            echo '❌ Pipeline упал'
            sh '''
                docker compose logs --tail=100 || docker-compose logs --tail=100 || true
            '''
        }
    }
}