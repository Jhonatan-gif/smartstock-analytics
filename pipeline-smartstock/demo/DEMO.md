# Guion de demostración en vivo — Pipeline CI/CD SmartStock

Duración total: **~20 minutos**. Cada paso se dispara con un solo comando; mientras Jenkins trabaja, se explica lo que está pasando.

| # | Qué se demuestra | Disparador | Espera |
|---|---|---|---|
| 0 | Infraestructura y configuración como código | — | — |
| 1 | Ejecución selectiva + caché (feature) | `git push` de `feature/demo-catalogo` | ~45 s |
| 2 | Error de ESLint → fail-fast + ✖ en GitHub | `git push` de `feature/demo-error` | ~45 s |
| 3 | Pull Request → SonarQube + Quality Gate + checks en GitHub | `gh pr create` | ~2–3 min |
| 4 | Merge a `develop` → pipeline completo (Docker, Cypress, staging) | `gh pr merge` | ~3–4 min |
| 5 | `release/1.1` → `main` → aprobación manual a producción | `git push` + `gh pr` | ~5 min |

---

## Antes de presentar (10 minutos antes)

Desde la raíz del repo, en PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File pipeline-smartstock\demo\preparar-demo.ps1
```

Debe terminar en **TODO LISTO**. Enciende Jenkins y SonarQube, valida los tokens, descarga las imágenes que falten y comprueba que las ramas de la demo estén listas.

Deja abiertas estas pestañas en el navegador (inicia sesión en Jenkins antes):

1. Jenkins — http://localhost:8081/job/smartstock-analytics/
2. GitHub — https://github.com/Jhonatan-gif/smartstock-analytics
3. SonarQube — http://localhost:9000/dashboard?id=smartstock-analytics

Y una terminal en `C:\Users\USER\Documents\PROYECTOS\stock-system`.

---

## Paso 0 — Presentar la infraestructura (2 min, sin esperas)

**Mostrar:**
- `pipeline-smartstock/infra/docker-compose.yml`: Jenkins + SonarQube en la red `ci-net`.
- `pipeline-smartstock/infra/jenkins/casc.yaml`: **JCasC**. Usuario, credenciales, servidor SonarQube, Shared Library y job multibranch se crean solos; solo se ingresan los tokens en `.env`.
- `Jenkinsfile` en la raíz y la Shared Library https://github.com/Jhonatan-gif/smartstock-shared-lib (`vars/*.groovy`).
- En Jenkins, la pestaña 1: el job **SmartStock Analytics** solo tiene `main` y `develop`.

**Decir:** "Seguimos GitFlow: las features salen de `develop`, `develop` se integra en una `release` y la release va a `main`. Cada rama ejecuta solo lo que le corresponde."

---

## Paso 1 — Ejecución selectiva y caché (feature)

```powershell
git checkout feature/demo-catalogo
git log --oneline -1          # muestra el commit: solo cambia el frontend
git push -u origin feature/demo-catalogo
```

En Jenkins → **Scan Repository Now** (o esperar ≤ 1 min) → abrir **feature/demo-catalogo** → build **#1** → **Stages**.

**Mostrar:**
- En el diagrama, **todas las etapas del backend aparecen omitidas** (»), igual que SonarQube, Docker, Cypress y Deploy.
- **Console Output** → Ctrl+F `Detección de cambios`:
  ```
  🔎 Detección de cambios (modo SELECTIVO; base=origin/develop)
     • backend: sin cambios, se omite
     • frontend: se ejecuta
  ```
- Ctrl+F `Cache HIT`: `♻️ Cache HIT (frontend)` → no se ejecuta `npm ci`, se restaura `node_modules` en segundos.

**Decir:** "Una feature recibe feedback rápido: lint, auditoría y pruebas solo de lo que cambió, en menos de un minuto. El primer build sin caché tardó 13 minutos."

---

## Paso 2 — Un error detiene el pipeline (fail-fast) y GitHub lo muestra

```powershell
git checkout feature/demo-error
git log --oneline -1          # el commit agrega una variable sin usar en el backend
git push -u origin feature/demo-error
```

En Jenkins → **feature/demo-error** → build **#1** → **Stages**.

**Mostrar:**
- Ahora es al revés: se ejecuta el **backend** y se omite el frontend.
- **ESLint · backend** en rojo ✖ con el mensaje `'descuentoTemporal' is assigned a value but never used`.
- **Auditoría de dependencias** cortada por el **fail-fast** (`parallelsAlwaysFailFast`) y el resto de etapas no se ejecuta.
- En GitHub: **Code → branch `feature/demo-error` → commits** → clic en la ✖ junto al commit: `jenkins/smartstock-ci — Build #1 falló — revisar logs` (bloque `post { failure }`).

**Opcional — corregirlo en vivo (~45 s):**

```powershell
git revert --no-edit HEAD
git push
```

El build **#2** queda en verde ✔ y GitHub cambia a ✔.

---

## Paso 3 — Pull Request: SonarQube, Quality Gate y checks

```powershell
git checkout feature/demo-catalogo
gh pr create --base develop --head feature/demo-catalogo --title "Catálogo: contador de productos" --body "Muestra cuántos productos coinciden con los filtros."
```

Se abre el PR en GitHub; Jenkins crea el job **PR-N**.

**Mostrar:**
- En GitHub, el PR con los checks **en curso (●)** → al terminar, **✔ All checks have passed** (`jenkins/smartstock-ci`).
- En Jenkins, **PR-N** → **Stages**: aparecen **Análisis SonarQube** y **Quality Gate** (en la feature no corrían).
- Console Output → Ctrl+F `Lock acquired`: el análisis toma el lock `sonarqube-smartstock` (SonarQube Community admite una rama por proyecto).
- SonarQube (pestaña 3): bugs, code smells, cobertura y Quality Gate **Passed**.

**Decir:** "La calidad se valida antes de integrar: si el Quality Gate falla, el pipeline se aborta y el PR queda en rojo."

---

## Paso 4 — Merge a develop: pipeline completo

```powershell
gh pr merge --merge
```

En Jenkins → **develop** → build nuevo → **Stages** (~3–4 min).

**Mostrar:**
- **Ejecución paralela**: instalación (backend ‖ frontend), calidad (ESLint ‖ ESLint ‖ audit), pruebas (Jest ‖ Vitest) y build (bundle ‖ imagen backend ‖ imagen frontend).
- **Imágenes Docker** `smartstock-backend` / `smartstock-frontend` etiquetadas con la rama y el commit.
- **Pruebas E2E · Cypress**: 5/5 (la API se simula con `cy.intercept`).
- **Deploy · Staging**: despliegue simulado (no hay hosting configurado).
- **Tests** (menú izquierdo): resultados de Jest (29) y Vitest (18).

---

## Paso 5 — Release a producción con aprobación manual

```powershell
git checkout develop
git pull
git checkout -b release/1.1
git push -u origin release/1.1
gh pr create --base main --head release/1.1 --title "Release 1.1" --body "Contador de productos en el catálogo."
gh pr checks --watch          # esperar a que los checks queden en verde (~2–3 min)
gh pr merge --merge
```

En Jenkins → **main** → build nuevo → **Stages**.

**Mostrar:**
- El pipeline completo y, al final, la pausa en **Deploy · Producción**: **"¿Desplegar SmartStock a producción?"**.
- Clic en **Desplegar** → el build termina ✔ y GitHub marca el commit de `main` con ✔.

> El botón espera **15 minutos**; si nadie lo pulsa, el build se cancela.

**Cierre:** volver a la lista de ramas del job: `main`, `develop`, la release y las features con su estado.

---

## Plan B (si algo falla en vivo)

Mostrar builds que ya existen:

| Qué | URL |
|---|---|
| Pipeline completo en develop | http://localhost:8081/job/smartstock-analytics/job/develop/3/stages |
| Primer build sin caché (13 min) | Ver captura en la presentación / informe |

Y consultar la sección 7 de [INSTRUCTIVO.md](../INSTRUCTIVO.md) (problemas frecuentes).

---

## Después de la demo (opcional)

Integrar `main` de vuelta en `develop` (paso final de GitFlow) y borrar las ramas de la demo:

```powershell
git checkout develop
git pull
git merge origin/main
git push
git push origin --delete feature/demo-catalogo feature/demo-error release/1.1
```

## Repetir la demo

Las ramas `feature/demo-*` solo sirven una vez (después de subirlas, Jenkins ya las conoce). Para repetir:

```powershell
git checkout develop
git pull
git branch -D feature/demo-catalogo feature/demo-error
git checkout -b feature/demo-catalogo
# hacer un cambio pequeño en frontend/src (por ejemplo un texto en CatalogoPage.jsx)
git commit -am "feat(catalogo): cambio para la demo"
git checkout develop
git checkout -b feature/demo-error
# agregar una variable sin usar en backend/src/controllers/productsController.js
git commit -am "feat(productos): cambio con error de ESLint para la demo"
```
