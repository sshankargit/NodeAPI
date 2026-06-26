pipeline {
    agent any
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Install Dependencies') { steps { sh 'npm install' } }
        stage('Initialize Database') { steps { sh 'npm run init-db' } }
        stage('Run Closed-loop AI Quality Gates') { steps { sh 'npm run pipeline:local' } }
        stage('Deploy or Block') { steps { echo 'All quality gates passed. Deployment can proceed.' } }
    }
    post {
        always {
            archiveArtifacts artifacts: 'ai/**, validation/reports/**, tests/ai_generated_api.test.js, *.log', allowEmptyArchive: true
        }
        failure {
            echo 'Pipeline failed. Review validation/reports/gate5_ollama_rca_report.md'
        }
    }
}
