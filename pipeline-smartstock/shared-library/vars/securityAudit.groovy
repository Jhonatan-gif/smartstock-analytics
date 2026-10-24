/**
 * npm audit en cada módulo. Si hay vulnerabilidades altas el build
 * queda UNSTABLE (amarillo) pero no se detiene.
 */
def call(List modules) {
    modules.each { m ->
        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
            dir(m) {
                sh 'npm audit --omit=dev --audit-level=high'
            }
        }
    }
}
