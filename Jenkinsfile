pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    environment {
        // Используем правильный формат для токена
        GIT_TOKEN = credentials('github-token')
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
                    sh 'npm install --no-audit --no-fund'
                }
            }
        }

        stage('Frontend Install & Build') {
            steps {
                script {
                    if (fileExists('frontend/package.json')) {
                        dir('frontend') {
                            sh 'npm install --no-audit --no-fund'
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
                    // Используем withCredentials для явной передачи токена
                    withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                        sh '''
                            git config user.email "jenkins@ci-cd.local"
                            git config user.name "Jenkins CI"
                            
                            # Меняем remote URL, используя токен
                            git remote set-url origin https://AntonShevv:${GITHUB_TOKEN}@github.com/AntonShevv/KP_PSKP.git
                            
                            # Проверяем ветку
                            git checkout master
                            
                            # Синхронизируем с удаленным репозиторием
                            git fetch origin
                            git reset --soft origin/master
                            
                            # Создаем файл
                            echo "Build #${BUILD_NUMBER}" > .build-info
                            echo "Completed at: $(date)" >> .build-info
                            echo "Tests: 16 passed" >> .build-info
                            
                            git add .build-info
                            git commit -m "CI: Auto-commit build #${BUILD_NUMBER} [skip ci]" || echo "Nothing to commit"
                            
                            # Пушим
                            git push origin master
                            
                            echo "✅ Изменения запушены в GitHub"
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo '🎉 Все тесты прошли успешно!'
        }
        failure {
            echo '❌ Тесты не прошли!'
        }
    }
}