/**
 * CACHÉ: restaura node_modules desde un .tar.gz cuya clave es
 * hash(package-lock.json) + versión de Node + arquitectura.
 * HIT  -> se extrae en segundos (no corre npm ci).
 * MISS -> npm ci (usando además la caché global de npm) y se guarda el archivo.
 */
def call(String path) {
    String cacheRoot = env.CI_CACHE_DIR ?: "${env.JENKINS_HOME}/.cache"
    String prefix = path.replace('/', '_')
    dir(path) {
        String key = sh(returnStdout: true, script: '''
            echo "$(sha256sum package-lock.json | cut -c1-16)-$(node -v)-$(uname -m)"
        ''').trim()
        String archive = "${cacheRoot}/node_modules/${prefix}-${key}.tar.gz"

        if (sh(script: "test -f '${archive}'", returnStatus: true) == 0) {
            echo "♻️  Cache HIT  (${path}) -> ${archive}"
            sh "rm -rf node_modules && tar -xzf '${archive}'"
        } else {
            echo "🐢 Cache MISS (${path}) -> npm ci"
            sh 'npm ci --prefer-offline --no-audit --no-fund'
            sh """
                mkdir -p '${cacheRoot}/node_modules'
                tar -czf '${archive}.tmp' node_modules && mv '${archive}.tmp' '${archive}'
                # conservar solo las 3 cachés más recientes de este módulo
                ls -1t '${cacheRoot}/node_modules/${prefix}-'*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
            """
        }
    }
}
