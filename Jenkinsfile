pipeline {
    agent any

    environment {
        OLLAMA_HOST = 'http://localhost:11434'
        OLLAMA_MODEL = 'llama3.1'
    }

    options {
        skipDefaultCheckout(true)
    }

    stages {
        stage('Checkout SCM') {
            steps {
                checkout scm
            }
        }

        stage('Verify Environment') {
            steps {
                bat 'node -v'
                bat 'npm -v'                
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

        stage('Gate 1 - AI Test Generation') {
            steps {
                bat 'npm run gate1:closed-loop'
            }
        }

        stage('Gate 2 - API Validation') {
            steps {
                bat 'npm run test:manual'
            }
        }

        stage('Gate 3 - Data Validation') {
            steps {
                bat 'npm run validate:data'
            }
        }

        stage('Gate 4 - KPI Validation') {
            steps {
                bat 'npm run validate:kpi'
            }
        }

        stage('Gate 5 - AI RCA') {
            steps {
                bat 'npm run gate5:rca'
            }
        }

        stage('Deploy or Block') {
            steps {
                echo 'All quality gates passed. Deployment approved.'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'ai/**, validation/reports/**, tests/ai_generated_api.test.js, *.log', allowEmptyArchive: true
        }

        success {
            echo 'Pipeline completed successfully. Deployment approved.'
        }

        failure {
            echo 'Pipeline failed. Deployment blocked. Review validation/reports/gate5_ollama_rca_report.md'
        }
    }
}