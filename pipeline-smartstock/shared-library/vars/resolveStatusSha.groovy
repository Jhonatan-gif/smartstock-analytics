/**
 * En un PR, Jenkins construye un commit de merge; el estado debe ir al
 * commit HEAD del PR para que GitHub lo muestre. Exporta STATUS_SHA.
 */
def call() {
    String sha = env.GIT_COMMIT
    if (env.CHANGE_ID) {
        // Sin commit de merge (PR que avanza en fast-forward) HEAD^2 no existe:
        // --verify -q evita que rev-parse imprima el texto 'HEAD^2' al fallar
        sha = sh(returnStdout: true, script: 'git rev-parse --verify -q HEAD^2 || git rev-parse HEAD').trim()
    }
    env.STATUS_SHA = sha
}
