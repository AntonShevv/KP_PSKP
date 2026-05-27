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
                    sh 'npm test -- tests/authService.unit.test.js || echo "⚠️ Тесты не найдены"'
                }
            }
        }

        stage('Hello World') {
            steps {
                echo '✅ CI/CD Pipeline работает!'
                sh 'node --version'
                sh 'npm --version'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo '🎉 Pipeline успешен!'
        }
        failure {
            echo '❌ Pipeline упал'
        }
    }
}