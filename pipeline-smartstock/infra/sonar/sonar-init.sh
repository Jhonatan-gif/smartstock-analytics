#!/bin/sh
# Registra en SonarQube el webhook hacia Jenkins (lo usa waitForQualityGate).
# Idempotente: si el webhook ya existe no hace nada.
SONAR=http://sonarqube:9000
HOOK_URL=http://jenkins:8080/sonarqube-webhook/

if [ -z "$SONAR_TOKEN" ]; then
  echo "SONAR_TOKEN vacío: genera el token en SonarQube, agrégalo a infra/.env y ejecuta 'docker compose up -d'"
  exit 0
fi

echo "Esperando a SonarQube..."
until curl -fs "$SONAR/api/system/status" | grep -q '"status":"UP"'; do sleep 5; done

if curl -fs -u "$SONAR_TOKEN:" "$SONAR/api/webhooks/list" | grep -q "$HOOK_URL"; then
  echo "Webhook a Jenkins ya registrado"
else
  curl -fsS -u "$SONAR_TOKEN:" -X POST "$SONAR/api/webhooks/create" \
       --data-urlencode "name=Jenkins" --data-urlencode "url=$HOOK_URL" \
    && echo && echo "Webhook a Jenkins creado: $HOOK_URL"
fi
