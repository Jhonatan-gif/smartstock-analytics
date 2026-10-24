/**
 * Ramas "protegidas" de GitFlow que ejecutan el pipeline completo.
 * Uso: when { expression { isProtectedBranch() } }
 */
def call() {
    def b = env.BRANCH_NAME ?: ''
    return b in ['main', 'develop'] || b ==~ /(release|hotfix)\/.+/
}
