import groovy.json.JsonOutput

/**
 * NOTIFICACIÓN A GITHUB: publica un Commit Status (✔ / ✖ / ●) visible en
 * el commit y en el Pull Request.
 * state: pending | success | failure | error
 * Requiere credencial "Secret text" 'github-token' (PAT con permiso Commit statuses: write).
 */
def call(String state, String description, String context = 'jenkins/smartstock-ci') {
    String repo = env.GITHUB_REPO
    String sha  = env.STATUS_SHA ?: env.GIT_COMMIT
    if (!repo || !(sha ==~ /[0-9a-f]{40}/)) {
        echo "githubStatus: GITHUB_REPO o SHA inválido ('${sha}'), se omite la notificación"
        return
    }
    String body = JsonOutput.toJson([
        state      : state,
        target_url : env.BUILD_URL,
        description: description.take(140),
        context    : context
    ])
    writeFile file: '.gh-status.json', text: body
    try {
        withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
            sh """
                curl -sS -X POST --retry 3 --retry-all-errors --retry-delay 2 \
                  -H "Authorization: Bearer \$GH_TOKEN" \
                  -H "Accept: application/vnd.github+json" \
                  https://api.github.com/repos/${repo}/statuses/${sha} \
                  -d @.gh-status.json -o /dev/null -w "GitHub status '${state}': HTTP %{http_code}\\n"
            """
        }
    } catch (err) {
        echo "⚠️ No se pudo notificar a GitHub: ${err.message}" // la notificación nunca rompe el build
    }
}
