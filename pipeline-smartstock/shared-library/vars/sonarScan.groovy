/**
 * Análisis estático con SonarQube. Requiere:
 *  - Servidor configurado en Jenkins con nombre 'sonarqube'
 *  - sonar-project.properties en la raíz del repo
 * La carpeta de usuario de Sonar se cachea en CI_CACHE_DIR/sonar.
 */
def call(Map cfg = [:]) {
    String server = cfg.server ?: 'sonarqube'
    withSonarQubeEnv(server) {
        sh """
            sonar-scanner \
              -Dsonar.host.url=\$SONAR_HOST_URL \
              -Dsonar.token=\$SONAR_AUTH_TOKEN \
              -Dsonar.userHome=${env.CI_CACHE_DIR}/sonar \
              -Dsonar.projectVersion=${env.BUILD_NUMBER}
        """
    }
}
