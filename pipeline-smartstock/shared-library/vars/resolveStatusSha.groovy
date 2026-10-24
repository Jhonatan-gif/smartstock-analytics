/**
 * En un PR, Jenkins construye un commit de merge; el estado debe ir al
 * commit HEAD del PR para que GitHub lo muestre. Exporta STATUS_SHA.
 */
def call() {
    String sha = env.GIT_COMMIT
    if (env.CHANGE_ID) {
        sha = sh(returnStdout: true, script: 'git rev-parse HEAD^2 2>/dev/null || git rev-parse HEAD').trim()
    }
    env.STATUS_SHA = sha
}
