# Instructivo: cómo ejecutar el pipeline CI/CD de SmartStock

Guía paso a paso para levantar Jenkins y SonarQube, ejecutar el pipeline y leer sus resultados.
Para el diseño del pipeline (etapas, optimizaciones, GitFlow) ver [GUIA.md](GUIA.md).

| Servicio | URL | Acceso |
|---|---|---|
| Jenkins | http://localhost:8081 | usuario y contraseña de `infra/.env` (`JENKINS_ADMIN_USER` / `JENKINS_ADMIN_PASSWORD`) |
| SonarQube | http://localhost:9000 | `admin` / la contraseña que definiste |
| Repositorio | https://github.com/Jhonatan-gif/smartstock-analytics | — |
| Shared Library | https://github.com/Jhonatan-gif/smartstock-shared-lib | — |

---

## 1. Requisitos (una sola vez)

1. **Docker Desktop** encendido (con al menos 6 GB de memoria asignada).
2. **Git** y acceso al repositorio.
3. Archivo `pipeline-smartstock/infra/.env` con los tokens (copiarlo de `.env.example`):

   ```
   JENKINS_PORT=8081
   JENKINS_ADMIN_USER=admin
   JENKINS_ADMIN_PASSWORD=<tu contraseña>
   GITHUB_USER=Jhonatan-gif
   GITHUB_TOKEN=ghp_...        # token clásico con scopes: repo:status y public_repo
   SONAR_TOKEN=squ_...         # SonarQube → My Account → Security → User Token
   ```

   > **Token de GitHub:** se crea en https://github.com/settings/tokens/new?scopes=repo:status,public_repo&description=jenkins-smartstock.
   > Sin el permiso `repo:status`, Jenkins no puede marcar ✔/✖ en GitHub (error HTTP 403).

---

## 2. Levantar la infraestructura

Abrir una terminal en la carpeta del proyecto:

```bash
cd pipeline-smartstock/infra
docker compose up -d --build
```

Esperar 1–2 minutos y verificar:

```bash
docker ps
```

Deben aparecer `jenkins` y `sonarqube` en estado **Up**. El contenedor `sonar-init` se ejecuta una vez (registra el webhook del Quality Gate) y termina; es normal que no aparezca.

No hay que configurar nada a mano en Jenkins: **JCasC** crea el usuario, las credenciales, el servidor SonarQube, la Shared Library y el job `smartstock-analytics`.

> Si cambias un token en `.env`, aplica el cambio con `docker compose up -d` (recrea Jenkins y vuelve a cargar la configuración).

---

## 3. Ejecutar el pipeline

Hay tres formas. La primera es la normal en CI/CD; las otras sirven para demostraciones.

### Opción A — Automática: hacer push a una rama (recomendada)

Jenkins revisa GitHub **cada minuto** y construye cualquier rama nueva o con commits nuevos.

```bash
git checkout develop
git pull
git checkout -b feature/mi-cambio      # GitFlow: las features salen de develop

# ... editar código, por ejemplo frontend/src/pages/LoginPage.jsx ...

git add .
git commit -m "feat: descripción del cambio"
git push -u origin feature/mi-cambio
```

En menos de un minuto aparece `feature/mi-cambio` en http://localhost:8081/job/smartstock-analytics/ y empieza a ejecutarse.

> ¿No quieres esperar el minuto? En el job **smartstock-analytics** haz clic en **Scan Repository Now**.

### Opción B — Manual: botón "Build Now"

1. Entrar a http://localhost:8081/job/smartstock-analytics/
2. Clic en la rama (por ejemplo **develop**).
3. En el menú izquierdo, clic en **Build Now** (Construir ahora).

Útil para repetir un build y comparar tiempos (por ejemplo, para mostrar la caché).

### Opción C — Pull Request (integrar una feature)

1. Subir la rama (opción A).
2. En GitHub: **Pull requests → New pull request**, base `develop` ← compare `feature/mi-cambio` → **Create pull request**.
3. Jenkins crea el job **PR-N** y ejecuta el pipeline **con SonarQube y Quality Gate**.
4. En el PR aparecen los checks (● en curso → ✔ o ✖).
5. Si todo está en verde: **Merge pull request** → se ejecuta el pipeline completo en `develop`.

---

## 4. Qué se ejecuta en cada rama (GitFlow)

| Rama | Qué corre | Tiempo aprox. |
|---|---|---|
| `feature/*` | Solo los módulos que cambiaron: dependencias, ESLint, `npm audit`, pruebas unitarias y bundle | 30 s – 1 min |
| PR → `develop` | Lo anterior + **SonarQube + Quality Gate** | 1.5 – 3 min |
| `develop` | **Todo**: + imágenes Docker, **Cypress E2E**, deploy a staging | ~4 min |
| `release/*`, `hotfix/*` | Todo, sin deploy | ~4 min |
| `main` | Todo + **deploy a producción con aprobación manual** | ~4 min + aprobación |

El primer build de una instalación nueva tarda más (~13 min) porque descarga imágenes y no tiene caché.

---

## 5. Ver los resultados

Dentro de un build (por ejemplo http://localhost:8081/job/smartstock-analytics/job/develop/2/):

| Qué quiero ver | Dónde |
|---|---|
| Diagrama de etapas (paralelas, omitidas, fallidas) | **Stages** (menú izquierdo) |
| Log completo | **Console Output** |
| Resultado de las pruebas (Jest, Vitest) | **Tests** |
| Bundle del frontend y cobertura | **Artifacts** |
| Análisis de calidad | http://localhost:9000/dashboard?id=smartstock-analytics |
| Estado en GitHub (✔ / ✖) | En el commit o en el PR, junto al hash del commit |

Iconos en **Stages**:

- ✔ verde: etapa exitosa
- ✖ rojo: etapa fallida
- » gris: etapa omitida (no aplica a esa rama o el módulo no cambió)
- ⏸ azul: esperando aprobación

En el **Console Output**, buscar (Ctrl+F):

- `Detección de cambios`: qué módulos se ejecutan y cuáles se omiten.
- `Cache HIT` / `Cache MISS`: si se reutilizó `node_modules`.
- `RESUMEN SMARTSTOCK CI`: resumen final del build.
- `GitHub status`: notificación enviada a GitHub (HTTP 201 = correcta).

---

## 6. Desplegar a producción (rama `main`)

1. Integrar `release/x.y` en `main` mediante un PR.
2. El pipeline de `main` se detiene en **Deploy · Producción**.
3. Abrir el build → **Stages** → panel **"¿Desplegar SmartStock a producción?"**.
4. Clic en **Desplegar** para continuar, o en **Abort** para cancelar.

Si nadie responde en **15 minutos**, el build se cancela automáticamente.

> En este laboratorio no hay servidor de hosting: si no existe la credencial `render-hook-prod`, el despliegue se **simula** y queda indicado en el log.

---

## 7. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `GitHub status ...: HTTP 401` | `GITHUB_TOKEN` vacío o incorrecto | Corregir `.env` y ejecutar `docker compose up -d` |
| `GitHub status ...: HTTP 403` | Al token le falta el permiso para escribir estados | Usar un token clásico con `repo:status` |
| La rama no aparece en Jenkins | Aún no pasó el escaneo de 1 minuto | **Scan Repository Now** |
| La rama aparece "deshabilitada" | Tiene un PR abierto: se construye como **PR-N** | Revisar el job PR-N |
| Quality Gate se queda esperando | Falta el webhook de SonarQube | `docker compose up -d sonar-init --force-recreate` |
| `SonarQube analysis ... failed` (fecha anterior) | Dos análisis simultáneos (Community admite una sola rama). El `lock` del Jenkinsfile lo evita; puede ocurrir si Jenkins se reinició en medio de un análisis | Volver a ejecutar el build con **Build Now** |
| Jenkins no abre en el 8081 | Puerto ocupado | Cambiar `JENKINS_PORT` en `.env` y `docker compose up -d` |
| Build ✖ en `ESLint` | Error de estilo/código | Ver el detalle en **Stages** → ESLint, corregir y hacer push |
| Build amarillo (UNSTABLE) | `npm audit` encontró vulnerabilidades altas | `npm audit fix` en el módulo indicado |

---

## 8. Apagar y volver a encender

```bash
cd pipeline-smartstock/infra
docker compose stop       # apaga conservando builds, cachés y análisis
docker compose start      # vuelve a encender
```

> `docker compose down -v` borra también los volúmenes (historial de Jenkins, cachés y datos de SonarQube). Úsalo solo si quieres empezar de cero.
