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

        stage('Unit Tests') {
            steps {
                dir('backend') {
                    sh 'npm test -- tests/authService.unit.test.js'
                }
            }
        }

        stage('Docker Deploy') {
            steps {
                echo '🚀 Деплоим через Docker...'
                
                script {
                    // Используем Docker Pipeline API
                    docker.withTool('docker') {
                        sh '''
                            # Проверяем соединение с Docker
                            docker ps
                            
                            # Запускаем контейнеры
                            docker-compose -f docker-compose.yml down || true
                            docker-compose -f docker-compose.yml up -d --build
                        '''
                    }
                }
            }
        }
    }
}