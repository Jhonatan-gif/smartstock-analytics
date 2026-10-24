/**
 * Construye una imagen Docker reutilizando capas (BuildKit + --cache-from).
 * Uso: dockerBuild(name: 'smartstock-backend', context: 'backend')
 */
def call(Map cfg) {
    String name    = cfg.name
    String context = cfg.context ?: '.'
    String tag     = cfg.tag ?: env.IMAGE_TAG
    sh """
        docker build \
          --cache-from ${name}:latest \
          --build-arg BUILDKIT_INLINE_CACHE=1 \
          -t ${name}:${tag} -t ${name}:latest \
          ${context}
    """
    echo "🐳 Imagen lista: ${name}:${tag}"
}
