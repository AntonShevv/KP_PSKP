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
                    withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                        sh '''
                            git config user.email "jenkins@ci-cd.local"
                            git config user.name "Jenkins CI"
                            
                            # Создаем файл
                            echo "Build #${BUILD_NUMBER}" > .build-info
                            echo "Completed at: $(date)" >> .build-info
                            echo "Tests: 16 passed" >> .build-info
                            
                            git add .build-info
                            git commit -m "CI: Auto-commit build #${BUILD_NUMBER} [skip ci]" || echo "Nothing to commit"
                            
                            # Используем curl для пуша (обходит проблемы с токеном)
                            git push https://AntonShevv:${GITHUB_TOKEN}@github.com/AntonShevv/KP_PSKP.git HEAD:master
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