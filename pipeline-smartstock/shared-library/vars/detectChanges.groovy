/**
 * EJECUCIÓN SELECTIVA: detecta qué módulos cambiaron y exporta
 * <MODULO>_CHANGED=true|false (ej. BACKEND_CHANGED).
 *
 * - Ramas protegidas (main, develop, release/*, hotfix/*) -> siempre todo.
 * - Pull Requests -> diff contra la rama destino.
 * - feature/* -> diff contra el último commit exitoso de la rama.
 * - Si cambian archivos globales (Jenkinsfile, sonar, etc.) -> todo.
 */
def call(Map cfg = [:]) {
    List modules     = cfg.modules ?: ['backend', 'frontend']
    List globalPaths = cfg.globalPaths ?: ['Jenkinsfile', 'sonar-project.properties', 'docker-compose', '.github/']

    boolean full = isProtectedBranch()
    String base = null

    if (!full) {
        if (env.CHANGE_TARGET) {
            sh "git fetch --no-tags origin +refs/heads/${env.CHANGE_TARGET}:refs/remotes/origin/${env.CHANGE_TARGET}"
            base = "origin/${env.CHANGE_TARGET}"
        } else if (env.GIT_PREVIOUS_SUCCESSFUL_COMMIT) {
            base = env.GIT_PREVIOUS_SUCCESSFUL_COMMIT
        } else {
            full = true // primer build de la rama
        }
    }

    List changed = []
    if (!full) {
        String out = sh(script: "git diff --name-only ${base}...HEAD 2>/dev/null || echo __FULL__",
                        returnStdout: true).trim()
        if (out.contains('__FULL__')) {
            full = true
        } else {
            changed = out ? out.split('\n') as List : []
            if (changed.any { f -> globalPaths.any { g -> f.startsWith(g) } }) full = true
        }
    }

    Map result = [:]
    modules.each { m ->
        boolean hit = full || changed.any { f -> f.startsWith("${m}/") }
        result[m] = hit
        env["${m.toUpperCase()}_CHANGED"] = hit.toString()
    }

    echo "🔎 Detección de cambios (modo ${full ? 'COMPLETO' : 'SELECTIVO'}; base=${base ?: '-'})"
    result.each { k, v -> echo "   • ${k}: ${v ? 'se ejecuta' : 'sin cambios, se omite'}" }
    return result
}
