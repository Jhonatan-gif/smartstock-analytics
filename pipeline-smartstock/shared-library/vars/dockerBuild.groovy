/**
 * Construye una imagen Docker reutilizando capas con BuildKit.
 * - Mismo daemon (laboratorio): las capas se reutilizan solas; los Dockerfiles
 *   copian package*.json antes del código para que `npm ci` quede en caché.
 * - Agentes efímeros: pasar cacheFrom con una imagen de un registro
 *   (ej. 'ghcr.io/org/smartstock-backend:latest') para importar su caché inline.
 * Uso: dockerBuild(name: 'smartstock-backend', context: 'backend')
 */
def call(Map cfg) {
    String name      = cfg.name
    String context   = cfg.context ?: '.'
    String tag       = cfg.tag ?: env.IMAGE_TAG
    String cacheFrom = cfg.cacheFrom ? "--cache-from ${cfg.cacheFrom}" : ''
    sh """
        docker build ${cacheFrom} \
          --build-arg BUILDKIT_INLINE_CACHE=1 \
          -t ${name}:${tag} -t ${name}:latest \
          ${context}
    """
    echo "🐳 Imagen lista: ${name}:${tag}"
}
