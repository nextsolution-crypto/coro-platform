#!/usr/bin/env bash
# Activation encadrée de Sophie (assistant public du site) sur le serveur.
#   preflight : état (noms de variables seulement, aucune valeur)
#   provision : rôle PostgreSQL lecture seule + variables .env (prise d'effet
#               au déploiement suivant) + chargement du corpus public
#   verify    : contrôle du rôle (lecture seule, aucune table privée)
# Aucun mot de passe n'est affiché, passé en argument ni écrit hors du .env.
set -Eeuo pipefail
PHASE="${1:?phase}"
REPO=/opt/coro-platform
ENV_FILE="$REPO/.env"
SQL_DIR="${SOPHIE_SQL_DIR:?sql dir}"
ROLE=coro_public_knowledge_runtime

compose() { docker compose -f "$REPO/docker-compose.yml" "$@"; }
postgres="$(compose ps -q postgres)"; test -n "$postgres"
backend="$(compose ps -q backend)"; test -n "$backend"
psql_admin() { docker exec -i "$postgres" sh -ceu 'psql -v ON_ERROR_STOP=1 -X -q -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"'; }
env_has() { grep -Eq "^$1=.+" "$ENV_FILE"; }
env_value_is() { grep -Eq "^$1=$2\$" "$ENV_FILE"; }
set_env() {
  local name="$1" value="$2" tmp
  tmp="$(mktemp "$ENV_FILE.XXXXXX")"
  # Valeurs passées par l'environnement (jamais en argument visible dans ps).
  SET_NAME="$name" SET_VALUE="$value" awk 'BEGIN{n=ENVIRON["SET_NAME"];v=ENVIRON["SET_VALUE"];d=0} index($0, n"=")==1 {if(!d){print n"="v;d=1}next} {print} END{if(!d)print n"="v}' "$ENV_FILE" >"$tmp"
  chown --reference="$ENV_FILE" "$tmp"; chmod --reference="$ENV_FILE" "$tmp"
  mv "$tmp" "$ENV_FILE"
}

state() {
  local role_exists counts runtime
  role_exists="$(printf "SELECT count(*) FROM pg_roles WHERE rolname='%s';\n" "$ROLE" | psql_admin)"
  counts="$(printf 'SELECT (SELECT count(*) FROM "PublicKnowledgeSource" WHERE "publicationStatus"=%s), (SELECT count(*) FROM "PublicKnowledgeChunk");\n' "'PUBLISHED'" | psql_admin)"
  runtime="$(docker exec "$backend" node -e 'const k=["WEB_AI_INTELLIGENT_ASSISTANT_ENABLED","WEB_AI_PUBLIC_KNOWLEDGE_ENABLED","WEB_AI_PROVIDER","WEB_AI_BEDROCK_INVOCATION_ENABLED"];const o={};for(const n of k)o[n]=process.env[n]??null;o.PUBLIC_KNOWLEDGE_DATABASE_URL_SET=Boolean(process.env.PUBLIC_KNOWLEDGE_DATABASE_URL);process.stdout.write(JSON.stringify(o))')"
  node -e 'const [role,counts,runtime,a,b,c]=process.argv.slice(1);const [sources,chunks]=counts.split("|").map(Number);console.log(JSON.stringify({schemaVersion:1,execution:"PASS",readonlyRoleExists:role==="1",publishedSources:sources,chunks,envFile:{PUBLIC_KNOWLEDGE_DATABASE_URL:a==="1",WEB_AI_PUBLIC_KNOWLEDGE_ENABLED:b==="1",WEB_AI_INTELLIGENT_ASSISTANT_ENABLED:c==="1"},activeRuntime:JSON.parse(runtime)}))' \
    "$role_exists" "$counts" "$runtime" \
    "$(env_has PUBLIC_KNOWLEDGE_DATABASE_URL && echo 1 || echo 0)" \
    "$(env_value_is WEB_AI_PUBLIC_KNOWLEDGE_ENABLED true && echo 1 || echo 0)" \
    "$(env_value_is WEB_AI_INTELLIGENT_ASSISTANT_ENABLED true && echo 1 || echo 0)"
}

case "$PHASE" in
  preflight) state ;;
  provision)
    psql_admin <"$SQL_DIR/provision-readonly-role.sql"
    if ! env_has PUBLIC_KNOWLEDGE_DATABASE_URL; then
      cp --preserve=mode,ownership "$ENV_FILE" "/opt/coro-ops/backups/env.before-sophie.$(date -u +%Y%m%dT%H%M%SZ)"
      secret="$(openssl rand -hex 32)"
      printf "ALTER ROLE %s PASSWORD '%s';\n" "$ROLE" "$secret" | psql_admin
      db="$(docker exec "$postgres" sh -ceu 'printf %s "$POSTGRES_DB"')"
      set_env PUBLIC_KNOWLEDGE_DATABASE_URL "postgresql://$ROLE:$secret@postgres:5432/$db"
      unset secret
    fi
    set_env WEB_AI_PUBLIC_KNOWLEDGE_ENABLED true
    set_env WEB_AI_INTELLIGENT_ASSISTANT_ENABLED true
    # Chargement du corpus avec l'identité applicative (écriture), avant activation.
    docker exec -e PUBLIC_KNOWLEDGE_SYNC_CONFIRMATION=SYNC_PUBLIC_KNOWLEDGE "$backend" node dist/src/public-knowledge/sync-public-knowledge.js
    state
    ;;
  verify)
    url_line="$(grep -E '^PUBLIC_KNOWLEDGE_DATABASE_URL=' "$ENV_FILE" | head -1)"
    test -n "$url_line"
    secret="$(printf '%s' "$url_line" | sed -E 's#^[^:]+=postgresql://[^:]+:([^@]+)@.*#\1#')"
    result="$(printf 'SELECT current_user, current_setting(%s), has_table_privilege(current_user, %s, %s), has_table_privilege(current_user, %s, %s), has_table_privilege(current_user, %s, %s), (SELECT count(*) FROM "PublicKnowledgeSource");\n' \
      "'default_transaction_read_only'" "'\"PublicKnowledgeSource\"'" "'SELECT'" "'\"PublicKnowledgeSource\"'" "'INSERT'" "'\"Organization\"'" "'SELECT'" \
      | PGPASSWORD="$secret" docker exec -i -e PGPASSWORD "$postgres" sh -ceu "psql -v ON_ERROR_STOP=1 -X -q -At -h 127.0.0.1 -U $ROLE -d \"\$POSTGRES_DB\"")"
    unset secret
    node -e 'const [u,ro,sel,ins,org,count]=process.argv[1].split("|");const ok=u==="coro_public_knowledge_runtime"&&ro==="on"&&sel==="t"&&ins==="f"&&org==="f";console.log(JSON.stringify({schemaVersion:1,execution:ok?"PASS":"FAIL",...(ok?{}:{errorCode:"READONLY_ROLE_CONTRACT_FAILED"}),readOnly:ro==="on",publicSelect:sel==="t",publicWrite:ins==="t",privateTableSelect:org==="t",visibleSources:Number(count)}));if(!ok)process.exit(1)' "$result"
    ;;
  *) echo 'SOPHIE_PHASE_INVALID'; exit 2 ;;
esac
