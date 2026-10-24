# =============================================================================
#  Chequeo previo a la demostración del pipeline (ejecutar ~10 min antes)
#  Uso (desde la raíz del repo):  powershell -ExecutionPolicy Bypass -File pipeline-smartstock\demo\preparar-demo.ps1
# =============================================================================
$ErrorActionPreference = 'Stop'
$infra = Join-Path $PSScriptRoot '..\infra'
$repo  = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$ok = $true

function Paso($texto)  { Write-Host "`n== $texto" -ForegroundColor Cyan }
function Bien($texto)  { Write-Host "   [OK] $texto" -ForegroundColor Green }
function Mal($texto)   { Write-Host "   [X]  $texto" -ForegroundColor Red; $script:ok = $false }

# --- Leer infra/.env ----------------------------------------------------------
$envVars = @{}
Get-Content (Join-Path $infra '.env') | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)$' } |
  ForEach-Object { $envVars[$Matches[1]] = $Matches[2].Trim() }
$port = if ($envVars['JENKINS_PORT']) { $envVars['JENKINS_PORT'] } else { '8081' }
$jenkins = "http://localhost:$port"
$pair = "$($envVars['JENKINS_ADMIN_USER']):$($envVars['JENKINS_ADMIN_PASSWORD'])"
$jAuth = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($pair)) }

# --- 1. Contenedores ------------------------------------------------------------
Paso 'Encendiendo Jenkins y SonarQube'
Push-Location $infra
docker compose start jenkins sonarqube | Out-Null
Pop-Location
foreach ($c in 'jenkins', 'sonarqube') {
  $estado = docker inspect -f '{{.State.Status}}' $c 2>$null
  if ($estado -eq 'running') { Bien "$c en ejecución" } else { Mal "$c no está corriendo ($estado)" }
}

# --- 2. Servicios respondiendo -------------------------------------------------
Paso 'Esperando a que respondan los servicios'
$listo = $false
for ($i = 0; $i -lt 60 -and -not $listo; $i++) {
  try {
    $j = Invoke-WebRequest "$jenkins/login" -UseBasicParsing -TimeoutSec 5
    $s = Invoke-RestMethod 'http://localhost:9000/api/system/status' -TimeoutSec 5
    $listo = ($j.StatusCode -eq 200 -and $s.status -eq 'UP')
  } catch { }
  if (-not $listo) { Start-Sleep 5 }
}
if ($listo) { Bien "Jenkins ($jenkins) y SonarQube (http://localhost:9000) responden" } else { Mal 'Jenkins o SonarQube no responden' }

# --- 3. Tokens -----------------------------------------------------------------
Paso 'Validando tokens'
try {
  $r = Invoke-WebRequest 'https://api.github.com/repos/Jhonatan-gif/smartstock-analytics' -UseBasicParsing `
         -Headers @{ Authorization = "Bearer $($envVars['GITHUB_TOKEN'])"; 'User-Agent' = 'preparar-demo' }
  $scopes = $r.Headers['X-OAuth-Scopes']
  if ($scopes -match 'repo:status|(^|, )repo(,|$)') { Bien "GitHub: token válido (scopes: $scopes)" }
  else { Mal "GitHub: al token le falta 'repo:status' (scopes: $scopes)" }
} catch { Mal "GitHub: token inválido ($($_.Exception.Message))" }
try {
  $sAuth = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$($envVars['SONAR_TOKEN']):")) }
  $v = Invoke-RestMethod 'http://localhost:9000/api/authentication/validate' -Headers $sAuth
  if ($v.valid) { Bien 'SonarQube: token válido' } else { Mal 'SonarQube: token inválido' }
} catch { Mal "SonarQube: no se pudo validar el token ($($_.Exception.Message))" }

# --- 4. Imágenes ya descargadas (evita esperas en vivo) -------------------------
Paso 'Imágenes Docker de los agentes'
foreach ($img in 'node:20-bookworm-slim', 'cypress/included:13.17.0', 'sonarsource/sonar-scanner-cli:latest') {
  docker image inspect $img *> $null
  if ($LASTEXITCODE -eq 0) { Bien $img } else {
    Write-Host "   ... descargando $img (solo la primera vez)" -ForegroundColor Yellow
    docker pull -q $img | Out-Null
    if ($LASTEXITCODE -eq 0) { Bien "$img descargada" } else { Mal "No se pudo descargar $img" }
  }
}

# --- 5. Jenkins: job y escaneo de ramas ----------------------------------------
Paso 'Job multibranch en Jenkins'
try {
  $job = Invoke-RestMethod "$jenkins/job/smartstock-analytics/api/json?tree=jobs[name,color]" -Headers $jAuth
  Bien ("Ramas en Jenkins: " + (($job.jobs | ForEach-Object { [uri]::UnescapeDataString($_.name) }) -join ', '))
  $crumb = Invoke-RestMethod "$jenkins/crumbIssuer/api/json" -Headers $jAuth -SessionVariable js
  Invoke-WebRequest "$jenkins/job/smartstock-analytics/build?delay=0" -Method Post -UseBasicParsing -WebSession $js `
    -Headers ($jAuth + @{ $crumb.crumbRequestField = $crumb.crumb }) | Out-Null
  Bien 'Escaneo del repositorio lanzado (Scan Repository Now)'
} catch { Mal "No se pudo consultar Jenkins ($($_.Exception.Message))" }

# --- 6. Ramas de la demo en el repo local --------------------------------------
Paso 'Ramas locales de la demo'
Push-Location $repo
git fetch -q origin
foreach ($b in 'feature/demo-catalogo', 'feature/demo-error') {
  git rev-parse --verify -q $b *> $null
  if ($LASTEXITCODE -eq 0) {
    git ls-remote --exit-code --heads origin $b *> $null
    if ($LASTEXITCODE -eq 0) { Mal "$b ya está en GitHub: la demo de esa rama ya se ejecutó (ver DEMO.md, 'Repetir la demo')" }
    else { Bien "$b lista en local, sin subir" }
  } else { Mal "Falta la rama local $b (ver DEMO.md, 'Repetir la demo')" }
}
$sucio = git status --porcelain
if ($sucio) { Mal 'Hay cambios sin commit en el repo: hazles commit o stash antes de la demo' } else { Bien 'Árbol de trabajo limpio' }
Pop-Location

# --- Resultado -----------------------------------------------------------------
Write-Host ''
if ($ok) {
  Write-Host 'TODO LISTO para la demostración.' -ForegroundColor Green
  Write-Host "Abre: $jenkins/job/smartstock-analytics/  |  https://github.com/Jhonatan-gif/smartstock-analytics  |  http://localhost:9000"
} else {
  Write-Host 'Hay puntos en rojo: corrígelos antes de presentar (ver INSTRUCTIVO.md, sección 7).' -ForegroundColor Red
  exit 1
}
