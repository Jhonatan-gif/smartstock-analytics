/** Ejecuta un script de package.json dentro de un módulo. Uso: npmScript('backend', 'lint') */
def call(String path, String script) {
    dir(path) {
        sh "npm run ${script}"
    }
}
