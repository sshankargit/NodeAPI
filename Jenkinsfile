pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Initialize Database') {
            steps {
                bat 'npm run init-db'
            }
        }

        stage('Run Closed-loop AI Quality Gates') {
            steps {
                bat 'npm run pipeline:local'
            }
        }

        stage('Deploy or Block') {
            steps {
                echo 'Deployment Approved'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'validation/reports/**,tests/**', allowEmptyArchive: true
        }

        failure {
            echo 'Deployment Blocked'
        }
    }
}