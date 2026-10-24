import org.jenkinsci.plugins.credentialsbinding.impl.CredentialNotFoundException

/**
 * Despliegue mediante Deploy Hook (Render, Railway, etc.).
 * La URL del hook se guarda como credencial "Secret text".
 * Si la credencial no existe (laboratorio sin hosting), el despliegue se
 * simula y se indica en el log; un hook que responde con error sí falla el build.
 */
def call(Map cfg) {
    echo "🚀 Desplegando a ${cfg.environment}..."
    try {
        withCredentials([string(credentialsId: cfg.hookCredentialsId, variable: 'DEPLOY_HOOK')]) {
            sh 'curl -fsS -X POST "$DEPLOY_HOOK" -o /dev/null -w "Deploy hook HTTP %{http_code}\\n"'
        }
    } catch (CredentialNotFoundException err) {
        echo "ℹ️ Credencial '${cfg.hookCredentialsId}' no configurada: despliegue a ${cfg.environment} simulado (imagen ${env.IMAGE_TAG})"
    }
}
