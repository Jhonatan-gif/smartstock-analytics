// =============================================================================
//  SmartStock Analytics — Pipeline de Integración y Entrega Continua (Jenkins)
//  Estrategia de branching: GitFlow (feature/*, develop, release/*, hotfix/*, main)
//
//  Estrategias de optimización aplicadas:
//   1. Ejecución paralela  -> bloques `parallel` (instalación, calidad, pruebas, build)
//   2. Caché               -> node_modules por hash de package-lock, caché npm,
//                             binario de Cypress, caché de Sonar y capas Docker
//   3. Ejecución selectiva -> `when` por rama + detección de cambios por módulo
//   4. Modular/reutilizable-> Shared Library `smartstock-shared-lib` (vars/*.groovy)
// =============================================================================

@Library('smartstock-shared-lib@main') _

def NODE_IMAGE    = 'node:20-bookworm-slim'
def CYPRESS_IMAGE = 'cypress/included:13.17.0'
def SONAR_IMAGE   = 'sonarsource/sonar-scanner-cli:latest'

pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds(abortPrevious: true) // cancela builds viejos de la misma rama
        parallelsAlwaysFailFast()                    // si una rama paralela falla, corta las demás
        timestamps()
    }

    environment {
        GITHUB_REPO          = 'Jhonatan-gif/smartstock-analytics'
        CI_CACHE_DIR         = "${JENKINS_HOME}/.cache"
        npm_config_cache     = "${JENKINS_HOME}/.cache/npm"
        CYPRESS_CACHE_FOLDER = "${JENKINS_HOME}/.cache/Cypress"
        DOCKER_BUILDKIT      = '1'
    }

    stages {

        // ------------------------------------------------------------------ 0
        stage('Preparación') {
            steps {
                script {
                    resolveStatusSha()
                    githubStatus('pending', "Pipeline #${env.BUILD_NUMBER} en ejecución")
                    detectChanges(modules: ['backend', 'frontend'])
                    env.IMAGE_TAG = "${env.BRANCH_NAME.replaceAll('/', '-')}-${env.GIT_COMMIT.take(7)}"
                }
            }
        }

        // ------------------------------------------------------------------ 1
        stage('Instalar dependencias') {
            parallel {
                stage('Deps · backend') {
                    when { beforeAgent true; expression { env.BACKEND_CHANGED == 'true' } }
                    agent { docker { image NODE_IMAGE; reuseNode true } }
                    steps { npmInstallCached('backend') }
                }
                stage('Deps · frontend') {
                    when { beforeAgent true; expression { env.FRONTEND_CHANGED == 'true' } }
                    agent { docker { image NODE_IMAGE; reuseNode true } }
                    steps { npmInstallCached('frontend') }
                }
            }
        }

        // ------------------------------------------------------------------ 2
        stage('Calidad de código') {
            parallel {
                stage('ESLint · backend') {
                    when { beforeAgent true; expression { env.BACKEND_CHANGED == 'true' } }
                    agent { docker { image NODE_IMAGE; reuseNode true } }
                    steps { npmScript('backend', 'lint') }
                }
                stage('ESLint · frontend') {
                    when { beforeAgent true; expression { env.FRONTEND_CHANGED == 'true' } }
                    agent { docker { image NODE_IMAGE; reuseNode true } }
                    steps { npmScript('frontend', 'lint') }
                }
                stage('Auditoría de dependencias') {
                    agent { docker { image NODE_IMAGE; reuseNode true } }
                    steps { securityAudit(['backend', 'frontend']) }
                }
            }
        }

        // ------------------------------------------------------------------ 3
        stage('Pruebas unitarias') {
            parallel {
                stage('Jest · backend') {
                    when { beforeAgent true; expression { env.BACKEND_CHANGED == 'true' } }
                    agent { docker { image NODE_IMAGE; reuseNode true } }
                    steps { npmScript('backend', 'test:ci') }
                    post { always { junit allowEmptyResults: true, testResults: 'backend/reports/*.xml' } }
                }
                stage('Vitest · frontend') {
                    when { beforeAgent true; expression { env.FRONTEND_CHANGED == 'true' } }
                    agent { docker { image NODE_IMAGE; reuseNode true } }
                    steps { npmScript('frontend', 'test:ci') }
                    post { always { junit allowEmptyResults: true, testResults: 'frontend/reports/*.xml' } }
                }
            }
        }

        // ------------------------------------------------------------------ 4
        stage('Análisis SonarQube') {
            // Solo en PRs y ramas protegidas: en feature/* se prioriza feedback rápido
            when { beforeAgent true; expression { isProtectedBranch() || env.CHANGE_ID } }
            agent { docker { image SONAR_IMAGE; args "--network ci-net --entrypoint=''"; reuseNode true } }
            steps { sonarScan() }
        }

        stage('Quality Gate') {
            when { expression { isProtectedBranch() || env.CHANGE_ID } }
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ------------------------------------------------------------------ 5
        stage('Build') {
            parallel {
                stage('Bundle · frontend') {
                    when { beforeAgent true; expression { env.FRONTEND_CHANGED == 'true' } }
                    agent { docker { image NODE_IMAGE; reuseNode true } }
                    steps {
                        npmScript('frontend', 'build')
                        archiveArtifacts artifacts: 'frontend/dist/**', fingerprint: true
                    }
                }
                stage('Imagen Docker · backend') {
                    when { expression { isProtectedBranch() && env.BACKEND_CHANGED == 'true' } }
                    steps { dockerBuild(name: 'smartstock-backend', context: 'backend') }
                }
                stage('Imagen Docker · frontend') {
                    when { expression { isProtectedBranch() && env.FRONTEND_CHANGED == 'true' } }
                    steps { dockerBuild(name: 'smartstock-frontend', context: 'frontend') }
                }
            }
        }

        // ------------------------------------------------------------------ 6
        stage('Pruebas E2E · Cypress') {
            when { beforeAgent true; expression { isProtectedBranch() && env.FRONTEND_CHANGED == 'true' } }
            agent { docker { image CYPRESS_IMAGE; args "--entrypoint=''"; reuseNode true } }
            steps {
                dir('frontend') {
                    sh 'npx cypress verify || npx cypress install'
                    sh 'npm run e2e:ci'
                }
            }
            post {
                always {
                    archiveArtifacts allowEmptyArchive: true,
                        artifacts: 'frontend/cypress/videos/**, frontend/cypress/screenshots/**'
                }
            }
        }

        // ------------------------------------------------------------------ 7
        stage('Deploy · Staging') {
            when { branch 'develop' }
            steps { deploy(environment: 'staging', hookCredentialsId: 'render-hook-staging') }
        }

        stage('Deploy · Producción') {
            when { branch 'main' }
            steps {
                timeout(time: 15, unit: 'MINUTES') {
                    input message: '¿Desplegar SmartStock a producción?', ok: 'Desplegar'
                }
                deploy(environment: 'production', hookCredentialsId: 'render-hook-prod')
            }
        }
    }

    // ---------------------------------------------------------------------- POST
    post {
        always {
            archiveArtifacts allowEmptyArchive: true, artifacts: '**/coverage/lcov.info'
            pipelineSummary()
        }
        success {
            githubStatus('success', "Build #${env.BUILD_NUMBER} exitoso")
            notifyChat('success')
        }
        unstable {
            githubStatus('success', "Build #${env.BUILD_NUMBER} con advertencias (inestable)")
            notifyChat('unstable')
        }
        failure {
            githubStatus('failure', "Build #${env.BUILD_NUMBER} falló — revisar logs")
            notifyChat('failure')
        }
        aborted {
            githubStatus('error', "Build #${env.BUILD_NUMBER} cancelado")
        }
        cleanup {
            cleanWs(deleteDirs: true, disableDeferredWipeout: true)
        }
    }
}
