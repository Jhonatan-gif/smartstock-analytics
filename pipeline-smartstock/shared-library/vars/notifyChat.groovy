import groovy.json.JsonOutput

/**
 * Notificación opcional a Discord (o Slack con webhook compatible).
 * Se activa si existe la credencial 'discord-webhook'; si no, se omite.
 */
def call(String result) {
    Map icons = [success: '✅', unstable: '⚠️', failure: '❌']
    String msg = "${icons[result] ?: 'ℹ️'} **SmartStock CI** · `${env.BRANCH_NAME}` · build #${env.BUILD_NUMBER}: **${result.toUpperCase()}**\n${env.BUILD_URL}"
    writeFile file: '.chat.json', text: JsonOutput.toJson([content: msg])
    try {
        withCredentials([string(credentialsId: 'discord-webhook', variable: 'HOOK')]) {
            sh 'curl -sS -H "Content-Type: application/json" -d @.chat.json "$HOOK" -o /dev/null'
        }
    } catch (err) {
        echo 'notifyChat: sin webhook configurado, se omite'
    }
}
