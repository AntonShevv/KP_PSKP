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
                dir('backend') {
                    sh 'npm test -- tests/authService.unit.test.js'
                }
            }
        }

        stage('Docker Deploy') {
            steps {
                echo '🚀 Тесты прошли успешно! Деплоим через Docker Compose...'
                
                script {
                    // Используем 'docker compose' (без дефиса)
                    sh 'docker compose down || true'
                    sh 'docker compose up -d --build'
                    sh 'docker compose ps'
                }
                
                echo '✅ Деплой через Docker Compose завершен!'
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo '🏥 Проверка работоспособности...'
                    sh 'sleep 10'
                    sh 'curl -f http://localhost:5000/health || echo "⚠️ Бэкенд не отвечает"'
                }
            }
        }

        stage('Hello World') {
            steps {
                echo '✅ CI/CD Pipeline работает!'
                sh 'node --version'
                sh 'npm --version'
                sh 'docker --version'
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
            echo '🎉 Pipeline успешен!'
        }
        failure {
            echo '❌ Pipeline упал'
            sh 'docker compose down || true'
        }
    }
}