/**
 * npm audit en cada módulo. Si hay vulnerabilidades altas el build
 * queda UNSTABLE (amarillo) pero no se detiene.
 * catchInterruptions: false -> si el fail-fast corta esta rama paralela, la
 * interrupción se propaga y el build queda FAILURE (no ABORTED).
 */
def call(List modules) {
    modules.each { m ->
        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE', catchInterruptions: false) {
            dir(m) {
                sh 'npm audit --omit=dev --audit-level=high'
            }
        }
    }
}
