# Pipeline CI/CD — SmartStock Analytics

Pipeline de entrega continua en **Jenkins** para SmartStock Analytics (Node.js/Express + React/Vite + SQL Server), basado en la estrategia de branching **GitFlow** y con las cuatro estrategias de optimización: ejecución paralela, caché, ejecución selectiva y pipelines modulares.

---

## 1. Estructura del entregable

```
pipeline-smartstock/
├── shared-library/vars/*.groovy    → REPO APARTE: smartstock-shared-lib
├── infra/                          → Jenkins (JCasC) + SonarQube con Docker Compose
└── templates/                      → Dockerfiles, nginx, Cypress (ya copiados a backend/ y frontend/)
```

`Jenkinsfile` y `sonar-project.properties` ya están en la raíz del repositorio.

Estructura esperada del repositorio del proyecto:

```
smartstock-analytics/
├── backend/    (Express, Jest)   → package.json, package-lock.json, src/, tests/, Dockerfile
├── frontend/   (React + Vite)    → package.json, package-lock.json, src/, cypress/, Dockerfile
├── Jenkinsfile
└── sonar-project.properties
```

> Si su repo usa otros nombres de carpeta (ej. `server/` y `client/`), cambien `modules: [...]` en el Jenkinsfile y las rutas de `npmScript`, `npmInstallCached` y `sonar-project.properties`.

---

## 2. Estrategia de branching (GitFlow) y qué corre en cada rama

| Etapa                         | `feature/*` | PR → `develop` | `develop` | `release/*` · `hotfix/*` | `main` |
|-------------------------------|:-----------:|:--------------:|:---------:|:------------------------:|:------:|
| Detección de cambios          | ✔ selectiva | ✔ selectiva    | completo  | completo                 | completo |
| Instalar dependencias (caché) | ✔           | ✔              | ✔         | ✔                        | ✔ |
| ESLint + npm audit            | ✔           | ✔              | ✔         | ✔                        | ✔ |
| Pruebas unitarias (Jest/Vitest)| ✔          | ✔              | ✔         | ✔                        | ✔ |
| SonarQube + Quality Gate      | —           | ✔              | ✔         | ✔                        | ✔ |
| Build del bundle frontend     | ✔           | ✔              | ✔         | ✔                        | ✔ |
| Imágenes Docker               | —           | —              | ✔         | ✔                        | ✔ |
| E2E Cypress                   | —           | —              | ✔         | ✔                        | ✔ |
| Deploy                        | —           | —              | Staging   | —                        | Producción (aprobación manual) |

**Idea central:** las ramas `feature/*` reciben feedback rápido (lint + tests sólo de lo que cambió); las ramas protegidas ejecutan el pipeline completo antes de integrar o desplegar.

---

## 3. Estrategias de optimización aplicadas

### 3.1 Ejecución paralela
- Bloques `parallel` en **4 etapas**: instalación (backend ‖ frontend), calidad (ESLint backend ‖ ESLint frontend ‖ npm audit), pruebas (Jest ‖ Vitest) y build (bundle ‖ imagen backend ‖ imagen frontend).
- `parallelsAlwaysFailFast()`: si una rama paralela falla, se cancelan las demás y no se desperdicia tiempo.
- `disableConcurrentBuilds(abortPrevious: true)`: un push nuevo cancela el build anterior de la misma rama.

### 3.2 Caché
| Qué se cachea | Dónde | Cómo |
|---|---|---|
| `node_modules` | `$JENKINS_HOME/.cache/node_modules/*.tar.gz` | `npmInstallCached`: clave = hash de `package-lock.json` + versión de Node. Si coincide → *Cache HIT* y no se ejecuta `npm ci`. |
| Paquetes npm | `$JENKINS_HOME/.cache/npm` | Variable `npm_config_cache` + `npm ci --prefer-offline` en los *cache MISS*. |
| Binario de Cypress (~500 MB) | `$JENKINS_HOME/.cache/Cypress` | Variable `CYPRESS_CACHE_FOLDER`. |
| Plugins de SonarScanner | `$JENKINS_HOME/.cache/sonar` | `-Dsonar.userHome`. |
| Capas Docker | daemon Docker | BuildKit + `--cache-from` + Dockerfiles que copian `package*.json` antes del código. |

**Evidencia para el informe:** comparar el log del 1er build (`🐢 Cache MISS`) con el 2do (`♻️ Cache HIT`) y la duración de la etapa *Instalar dependencias*.

### 3.3 Ejecución selectiva (por ramas y etapas)
- **Por rama:** `when { branch 'develop' }`, `when { expression { isProtectedBranch() } }`, `env.CHANGE_ID` para PRs.
- **Por módulo:** `detectChanges()` compara contra la rama destino (PR) o el último commit exitoso (feature) y exporta `BACKEND_CHANGED` / `FRONTEND_CHANGED`. Si sólo cambió el frontend, todas las etapas del backend aparecen como *skipped*.
- `beforeAgent true`: la condición se evalúa **antes** de levantar el contenedor, así una etapa omitida no descarga imágenes.

### 3.4 Pipelines modulares y reutilizables
Shared Library `smartstock-shared-lib` con un paso por responsabilidad:

| Paso | Responsabilidad |
|---|---|
| `detectChanges` | Ejecución selectiva por módulo |
| `isProtectedBranch` | Regla de GitFlow centralizada |
| `npmInstallCached` | Instalación con caché |
| `npmScript` | Ejecutar cualquier script de `package.json` |
| `securityAudit` | `npm audit` → build UNSTABLE si hay vulnerabilidades altas |
| `sonarScan` | Análisis SonarQube |
| `dockerBuild` | Build de imagen con caché de capas |
| `deploy` | Despliegue por Deploy Hook (Render/Railway) |
| `githubStatus` / `resolveStatusSha` | Notificación a GitHub |
| `notifyChat` | Notificación opcional a Discord |
| `pipelineSummary` | Resumen final |

El mismo `Jenkinsfile` sirve para otro proyecto Node (StockDinámico, por ejemplo) cambiando sólo `GITHUB_REPO` y `modules`.

---

## 4. Bloques `post`
| Condición | Acción |
|---|---|
| `always` | Archiva reportes de cobertura e imprime el resumen |
| `success` | Commit status ✔ en GitHub + mensaje a Discord |
| `unstable` | Status ✔ con advertencia (ej. vulnerabilidades en `npm audit`) |
| `failure` | Commit status ✖ en GitHub + mensaje a Discord |
| `aborted` | Status `error` en GitHub |
| `cleanup` | `cleanWs()` (las cachés viven fuera del workspace, no se pierden) |

Además, al iniciar se envía el estado `pending` (●), así el PR muestra el pipeline "en curso".

---

## 5. Puesta en marcha

> En este repositorio Jenkins se configura con **Jenkins Configuration as Code (JCasC)**: usuario admin, credenciales, servidor SonarQube, Global Pipeline Library y job multibranch salen de `infra/jenkins/casc.yaml`. Solo hay que ingresar los tokens en `infra/.env`.

### 5.1 Levantar Jenkins y SonarQube
```bash
cd pipeline-smartstock/infra
cp .env.example .env          # completar JENKINS_ADMIN_PASSWORD y GITHUB_TOKEN
docker compose up -d --build
```
- Jenkins: http://localhost:8081 (usuario/contraseña de `.env`, sin asistente de instalación, 4 executors). Se publica en el 8081 porque el 8080 suele estar ocupado; dentro de la red Docker sigue siendo `http://jenkins:8080`.
- SonarQube **Community Build 26.10**: http://localhost:9000 → usuario `admin` / `admin` (pide cambiarla). Se reemplazó `lts-community` (9.9, sin soporte de `sonar.token`).

### 5.2 SonarQube
1. *My Account → Security* → generar token y pegarlo en `SONAR_TOKEN` de `infra/.env`.
2. `docker compose up -d` → recrea Jenkins con el token y el servicio `sonar-init` registra automáticamente el webhook `http://jenkins:8080/sonarqube-webhook/` (necesario para el Quality Gate).

El servidor `sonarqube` (URL `http://sonarqube:9000`, credencial `sonar-token`) ya lo configura JCasC.

### 5.3 Credenciales en Jenkins
JCasC las crea a partir de `infra/.env`:

| ID | Tipo | Origen |
|---|---|---|
| `github-token` | Secret text | `GITHUB_TOKEN` — PAT fine-grained con **Commit statuses: Read and write**, **Contents: Read**, **Pull requests: Read** sobre `smartstock-analytics` y `smartstock-shared-lib` |
| `github-user-pat` | Username with password | `GITHUB_USER` + `GITHUB_TOKEN` (clonar en el multibranch y la Shared Library) |
| `sonar-token` | Secret text | `SONAR_TOKEN` |
| `render-hook-staging` / `render-hook-prod` | Secret text (opcional, manual) | Deploy Hook de Render. Si no existe, `deploy` simula el despliegue y lo indica en el log |
| `discord-webhook` | Secret text (opcional, manual) | Webhook de Discord para `notifyChat` |

### 5.4 Shared Library
Repo independiente `smartstock-shared-lib` con `vars/` **en la raíz** (copia de `shared-library/vars`). En Jenkins queda registrada por JCasC como *Global Pipeline Library* `smartstock-shared-lib`, versión por defecto `main`, *Modern SCM → GitHub*.

### 5.5 Job Multibranch
JCasC (Job DSL) crea `smartstock-analytics`: GitHub con `github-user-pat`, *Discover branches* + *Discover PRs from origin*, Script path `Jenkinsfile` y *Scan Multibranch Pipeline Triggers → cada 1 minuto* (Jenkins es local; alternativa: `ngrok http 8081` + webhook en GitHub).

### 5.6 Scripts en los `package.json`
**backend/package.json** (Jest + supertest; la base de datos SQL Server se mockea en `tests/helpers/dbMock.js`)
```json
"lint": "eslint .",
"test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit"
```

**frontend/package.json** (Vitest + Testing Library, Cypress con `cy.intercept`)
```json
"lint": "eslint . --max-warnings 0",
"test:ci": "vitest run --coverage --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml",
"build": "vite build",
"preview": "vite preview --host 127.0.0.1 --port 4173 --strictPort",
"e2e:ci": "start-server-and-test preview http://127.0.0.1:4173 \"cypress run\""
```
`cypress` está fijado en la versión exacta de la imagen `cypress/included` del Jenkinsfile (13.17.0).

### 5.7 Plantillas
Ya aplicadas: `backend/Dockerfile` (puerto 3001), `frontend/Dockerfile` (sin descargar el binario de Cypress), `frontend/nginx.conf`, `.dockerignore` en ambos, `frontend/cypress.config.js` y `frontend/cypress/`.

---

## 6. Guion de demostración (capturas para el informe)
1. **Push a `feature/login-ui` cambiando sólo el frontend** → etapas backend *skipped*, sin Sonar ni Docker (ejecución selectiva).
2. **Repetir el build** → `♻️ Cache HIT` y menor duración de *Instalar dependencias* (caché).
3. **Abrir PR `feature/* → develop`** → aparecen Sonar + Quality Gate; GitHub muestra ● pending y luego ✔/✖ (post + notificación).
4. **Merge a `develop`** → pipeline completo, etapas paralelas en *Pipeline Graph View*, imágenes Docker, Cypress y deploy a staging.
5. **Introducir un error de ESLint a propósito** → ✖ en GitHub, mensaje en Discord, fail-fast cancela las ramas paralelas.
6. **`release/1.0` → `main`** → pausa con botón *Desplegar* (aprobación manual).
7. Captura del proyecto en SonarQube (bugs, code smells, cobertura).
