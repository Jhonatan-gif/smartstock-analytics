/** Resumen al final del build (post always): qué se ejecutó y por qué. */
def call() {
    echo """
    ================= RESUMEN SMARTSTOCK CI =================
     Rama ............ ${env.BRANCH_NAME}${env.CHANGE_ID ? " (PR #${env.CHANGE_ID} -> ${env.CHANGE_TARGET})" : ''}
     Pipeline completo ${isProtectedBranch() ? 'sí (rama protegida)' : 'no (feedback rápido)'}
     Backend ......... ${env.BACKEND_CHANGED == 'true' ? 'ejecutado' : 'omitido'}
     Frontend ........ ${env.FRONTEND_CHANGED == 'true' ? 'ejecutado' : 'omitido'}
     Resultado ....... ${currentBuild.currentResult}
     Duración ........ ${currentBuild.durationString.replace(' and counting', '')}
    =========================================================
    """
}
