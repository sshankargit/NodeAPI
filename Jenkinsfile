pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    environment {
        OLLAMA_HOST = 'http://localhost:11434'
        OLLAMA_MODEL = 'llama3.1'
    }

    stages {
        stage('Checkout SCM') {
            steps {
                checkout scm
            }
        }
        
        stage('Clean Previous Reports') {
            steps {
                bat '''
                if exist validation\\reports (
                    del /Q validation\\reports\\*
                )
                '''
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
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    bat 'npm run gate1:closed-loop'
                }
            }
        }

        stage('Gate 2 - API Validation') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    bat 'npm run test:api-validation'
                }
            }
        }

        stage('Gate 3 - Data Validation') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    bat 'npm run validate:data'
                }
            }
        }

        stage('Gate 4 - KPI Validation') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    bat 'npm run validate:kpi'
                }
            }
        }

        stage('Gate 5 - AI Decision Intelligence') {
            steps {
                bat 'npm run gate5:decision'
            }
        }

        stage('Deploy or Block') {
            steps {
                script {
                    if (currentBuild.currentResult == 'SUCCESS') {
                        echo 'All quality gates passed. Deployment approved.'
                    } else {
                        error('One or more quality gates failed. Deployment blocked.')
                    }
                }
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
            echo 'Pipeline failed. Deployment blocked. Review validation/reports/gate5_decision_intelligence_report.md'
        }
    }
}