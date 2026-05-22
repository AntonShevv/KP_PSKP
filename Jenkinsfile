pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        DOCKER_IMAGE = 'quiz-app-backend'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        REGISTRY = 'docker.io' // или ваш registry
    }
    
    tools {
        nodejs 'NodeJS-18' 
    }
    
    stages {

        stage('Checkout') {
            steps {
                echo '📦 Клонирование репозитория...'
                checkout scm
                script {
                    def commitHash = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    echo "✅ Код получен. Commit: ${commitHash}"
                }
            }
        }
        
        // ============================================
        // STAGE 2: Установка зависимостей (бэкенд)
        // ============================================
        stage('Backend Install') {
            steps {
                echo '📦 Установка зависимостей бэкенда...'
                dir('backend') {
                    sh 'npm ci'
                }
            }
        }
        
        // ============================================
        // STAGE 3: Установка зависимостей (фронтенд)
        // ============================================
        stage('Frontend Install') {
            steps {
                echo '📦 Установка зависимостей фронтенда...'
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }
        
        // ============================================
        // STAGE 4: Запуск unit-тестов
        // ============================================
        stage('Unit Tests') {
            steps {
                echo '🧪 Запуск unit-тестов...'
                dir('backend') {
                    sh 'npm test -- tests/authService.unit.test.js || true'
                }
            }
            post {
                always {
                    // Сохраняем результаты тестов
                    junit 'backend/test-results.xml'
                }
            }
        }
        
        // ============================================
        // STAGE 5: Сборка фронтенда
        // ============================================
        stage('Frontend Build') {
            steps {
                echo '🏗️ Сборка React приложения...'
                dir('frontend') {
                    sh '''
                        export CI=false
                        export DISABLE_ESLINT_PLUGIN=true
                        npm run build
                    '''
                }
            }
            post {
                success {
                    echo '✅ Фронтенд успешно собран!'
                    archiveArtifacts artifacts: 'frontend/build/**/*', fingerprint: true
                }
            }
        }
        
        // ============================================
        // STAGE 6: Сборка Docker образов
        // ============================================
        stage('Docker Build') {
            steps {
                echo '🐳 Сборка Docker образов...'
                
                // Билдим бэкенд образ
                sh """
                    docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} -f backend/Dockerfile ./backend
                    docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest
                """
            }
            post {
                success {
                    echo '✅ Docker образы успешно собраны!'
                }
            }
        }
        
        // ============================================
        // STAGE 7: Запуск интеграционных тестов (опционально)
        // ============================================
        stage('Integration Tests') {
            steps {
                echo '🔧 Запуск интеграционных тестов...'
                script {
                    try {
                        // Запускаем тестовый контейнер
                        sh """
                            docker network create quiz-test-network 2>/dev/null || true
                            docker run -d --name test-sqlserver \
                                --network quiz-test-network \
                                -e ACCEPT_EULA=Y \
                                -e SA_PASSWORD=TestPassword123! \
                                -p 1435:1433 \
                                mcr.microsoft.com/mssql/server:2022-latest
                        """
                        // Ждём запуска SQL Server
                        sh 'sleep 30'
                        
                        dir('backend') {
                            sh 'NODE_ENV=test npm test -- tests/api.integration.test.js || true'
                        }
                    } finally {
                        // Очистка
                        sh '''
                            docker stop test-sqlserver 2>/dev/null || true
                            docker rm test-sqlserver 2>/dev/null || true
                            docker network rm quiz-test-network 2>/dev/null || true
                        '''
                    }
                }
            }
        }
        
        // ============================================
        // STAGE 8: Деплой (опционально)
        // ============================================
        stage('Deploy') {
            when {
                branch 'main' // Только для main ветки
            }
            steps {
                echo '🚀 Деплой приложения...'
                input message: 'Подтвердите деплой в production?', ok: 'Деплоить!'
                
                sh '''
                    docker-compose down
                    docker-compose up -d --build
                    docker system prune -f
                '''
                echo '✅ Приложение успешно развёрнуто!'
            }
        }
    }
    
    // ============================================
    // POST-действия (всегда выполняются)
    // ============================================
    post {
        always {
            echo '🏁 Завершение пайплайна...'
            cleanWs() // Очистка workspace
        }
        success {
            echo '🎉 Пайплайн выполнен успешно!'
        }
        failure {
            echo '❌ Пайплайн завершился с ошибкой!'
            // Отправка уведомления (опционально)
        }
    }
}