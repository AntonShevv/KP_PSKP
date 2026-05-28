pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    environment {
        GIT_REPO = 'https://github.com/AntonShevv/KP_PSKP.git'
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
                        echo '⚠️ Frontend не найден, пропускаем...'
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

        stage('Push to GitHub') {
            steps {
                echo '✅ Тесты прошли успешно! Пушим в GitHub...'
                
                script {
                    // Настройка git
                    sh '''
                        git config user.email "jenkins@ci-cd.local"
                        git config user.name "Jenkins CI"
                        
                        # Добавляем изменения
                        git add .
                        
                        # Проверяем есть ли изменения
                        if ! git diff --cached --quiet; then
                            git commit -m "Auto-commit: CI/CD pipeline passed [skip ci]"
                            git push origin master
                            echo "✅ Изменения запушены в GitHub"
                        else
                            echo "ℹ️ Нет изменений для пуша"
                        fi
                    '''
                }
            }
        }

        stage('Info') {
            steps {
                echo '✅ CI/CD Pipeline выполнен!'
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
            echo '🎉 Все тесты прошли успешно! Код отправлен в GitHub.'
        }
        failure {
            echo '❌ Тесты не прошли! Пуш в GitHub отменен.'
        }
    }
}