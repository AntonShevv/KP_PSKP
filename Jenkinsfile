pipeline {
    agent any

    // Указываем инструмент, который мы только что настроили
    tools {
        nodejs 'NodeJS-18' // Имя должно совпадать с тем, что вы указали в конфигурации Jenkins
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
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        // Добавьте другие ваши стадии (Test, Build, Deploy) здесь
        stage('Hello World') {
            steps {
                // Простой тест, чтобы убедиться, что Node.js работает
                sh 'node --version'
                sh 'npm --version'
            }
        }
    }
}