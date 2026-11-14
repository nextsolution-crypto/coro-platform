#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MODE="${1:-PLAN}"
DOMAIN=display.getcoro.io
LOCK_FILE="${CORO_DEPLOYMENT_LOCK_FILE:-/run/lock/coro-production-deployment.lock}"
AVAILABLE_DIR="${NGINX_AVAILABLE_DIR:-/etc/nginx/sites-available}"
ENABLED_DIR="${NGINX_ENABLED_DIR:-/etc/nginx/sites-enabled}"
ACME_WEBROOT="${DISPLAY_ACME_WEBROOT:-/var/www/letsencrypt}"
VHOST="$AVAILABLE_DIR/$DOMAIN.conf"
ENABLED="$ENABLED_DIR/$DOMAIN.conf"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
STATE_ROOT="${DISPLAY09_TLS_STATE_ROOT:-/opt/coro-ops/display09/tls}"
TEMPLATE="${DISPLAY09_NGINX_TEMPLATE:-$(dirname "$0")/nginx/display.getcoro.io.conf.template}"
TARGETS=(getcoro.io api.getcoro.io app.getcoro.io client.getcoro.io display.getcoro.io)
state_dir=''
changed=false
challenge_file=''
probe_dir=''

fail() { printf 'DISPLAY09_TLS_FAILED code=%s\n' "$1" >&2; exit 1; }
require_pass() { [[ "${!1:-}" == PASS ]] || fail "$1"; }
require_command() { command -v "$1" >/dev/null 2>&1 || fail "COMMAND_${1^^}_MISSING"; }

require_origin_change_authority() {
  if [[ "${ORIGIN_PATH_VERIFIED:-}" == PASS ]]; then
    require_pass DISPLAY_CLOUDFLARE_RULES_VERIFIED
    printf '%s\n' 'DISPLAY09_ORIGIN_MODE=VERIFIED'
    return
  fi
  [[ "${ORIGIN_PATH_VERIFIED:-NOT_VERIFIED}" == NOT_VERIFIED ]] || fail ORIGIN_PATH_STATUS_INVALID
  require_pass CONTROLLED_ORIGIN_VERIFICATION_AUTHORIZED
  require_pass CONTROLLED_ORIGIN_RISK_ACCEPTED
  [[ "${DISPLAY_CLOUDFLARE_RULES_VERIFIED:-}" == PARTIAL ]] || fail CLOUDFLARE_PARTIAL_EVIDENCE_REQUIRED
  printf '%s\n' 'DISPLAY09_ORIGIN_MODE=CONTROLLED_ORIGIN_VERIFICATION'
}

validate_common() {
  [[ "$MODE" =~ ^(PLAN|APPLY|VERIFY|ROLLBACK)$ ]] || fail MODE_INVALID
  [[ -f "$TEMPLATE" && ! -L "$TEMPLATE" ]] || fail TEMPLATE_INVALID
  grep -q 'proxy_pass http://127.0.0.1:3003;' "$TEMPLATE" || fail UPSTREAM_INVALID
  grep -q 'server_name display.getcoro.io;' "$TEMPLATE" || fail SERVER_NAME_INVALID
  ! grep -Eq 'ssl_certificate_key[[:space:]]+/etc/letsencrypt/live/(getcoro\.io|client\.getcoro\.io)/(privkey|key)' "$TEMPLATE" || fail HISTORICAL_KEY_REFERENCE_FORBIDDEN
}

render_vhost() {
  local output="$1"
  sed "s|__ACME_WEBROOT__|$ACME_WEBROOT|g" "$TEMPLATE" >"$output"
  chmod 0600 "$output"
}

prepare_acme_webroot() {
  [[ "$ACME_WEBROOT" == /var/www/* && "$ACME_WEBROOT" != *'/../'* && "$ACME_WEBROOT" != *'/..' ]] || fail ACME_WEBROOT_SCOPE_INVALID
  [[ ! -L "$ACME_WEBROOT" ]] || fail ACME_WEBROOT_SYMLINK_FORBIDDEN
  install -d -o root -g root -m 0755 \
    "$ACME_WEBROOT" \
    "$ACME_WEBROOT/.well-known" \
    "$ACME_WEBROOT/.well-known/acme-challenge"
  [[ "$(stat -c '%a' "$ACME_WEBROOT")" == 755 ]] || fail ACME_WEBROOT_PERMISSIONS_INVALID
  [[ "$(stat -c '%a' "$ACME_WEBROOT/.well-known/acme-challenge")" == 755 ]] || fail ACME_CHALLENGE_PERMISSIONS_INVALID
}

cleanup_http01_probe() {
  [[ -z "$challenge_file" ]] || rm -f -- "$challenge_file"
  if [[ -n "$probe_dir" && -d "$probe_dir" ]]; then
    rm -f -- "$probe_dir/expected" "$probe_dir/headers" "$probe_dir/body"
    rmdir -- "$probe_dir" 2>/dev/null || true
  fi
  challenge_file=''; probe_dir=''
}

probe_http_response() {
  local label="$1" expected="$2"; shift 2
  : >"$probe_dir/headers"; : >"$probe_dir/body"
  if ! curl --silent --show-error --max-time 15 --max-redirs 0 \
      -D "$probe_dir/headers" -o "$probe_dir/body" "$@"; then
    fail "ACME_${label}_REQUEST_FAILED"
  fi
  local status
  status="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END {print code+0}' "$probe_dir/headers")"
  [[ "$status" == 200 ]] || fail "ACME_${label}_HTTP_${status}"
  ! grep -Eqi '^location:' "$probe_dir/headers" || fail "ACME_${label}_REDIRECT_FORBIDDEN"
  cmp -s "$expected" "$probe_dir/body" || fail "ACME_${label}_BODY_MISMATCH"
}

probe_http01() {
  require_command curl; require_command getent
  prepare_acme_webroot
  probe_dir="$(mktemp -d "$state_dir/http01-probe.XXXXXX")"
  chmod 0700 "$probe_dir"
  local token expected_url ip count_v4=0 count_v6=0
  token="coro-display09-$(openssl rand -hex 16)"
  printf 'CORO-DISPLAY09-ACME-PROBE-%s' "$(openssl rand -hex 16)" >"$probe_dir/expected"
  challenge_file="$ACME_WEBROOT/.well-known/acme-challenge/$token"
  install -o root -g root -m 0644 "$probe_dir/expected" "$challenge_file"
  expected_url="http://$DOMAIN/.well-known/acme-challenge/$token"

  probe_http_response LOCAL "$probe_dir/expected" --resolve "$DOMAIN:80:127.0.0.1" "$expected_url"
  probe_http_response PUBLIC "$probe_dir/expected" "$expected_url"

  while read -r ip; do
    [[ -n "$ip" ]] || continue
    count_v4=$((count_v4 + 1))
    probe_http_response "IPV4_${count_v4}" "$probe_dir/expected" --resolve "$DOMAIN:80:$ip" "$expected_url"
  done < <(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u | head -n 4)
  [[ "$count_v4" -gt 0 ]] || fail ACME_IPV4_DNS_MISSING

  while read -r ip; do
    [[ -n "$ip" ]] || continue
    count_v6=$((count_v6 + 1))
    probe_http_response "IPV6_${count_v6}" "$probe_dir/expected" --resolve "$DOMAIN:80:[$ip]" "$expected_url"
  done < <(getent ahostsv6 "$DOMAIN" | awk '{print $1}' | sort -u | head -n 4)

  printf 'DISPLAY09_HTTP01_PREFLIGHT=PASS ipv4=%s ipv6=%s exact_body=true redirects=false\n' "$count_v4" "$count_v6"
  cleanup_http01_probe
}

backup_configuration() {
  mkdir -p "$STATE_ROOT"
  chmod 0700 "$STATE_ROOT"
  state_dir="$STATE_ROOT/$(date -u +%Y%m%dT%H%M%SZ)-$$"
  mkdir -m 0700 "$state_dir"
  printf '%s\n' "$VHOST" >"$state_dir/vhost.path"
  if [[ -e "$VHOST" ]]; then cp -a -- "$VHOST" "$state_dir/vhost.before"; else : >"$state_dir/vhost.absent"; fi
  if [[ -L "$ENABLED" ]]; then readlink -- "$ENABLED" >"$state_dir/enabled.target"; elif [[ -e "$ENABLED" ]]; then fail ENABLED_PATH_NOT_SYMLINK; else : >"$state_dir/enabled.absent"; fi
  nginx -T >"$state_dir/nginx.before.txt" 2>&1
  chmod 0600 "$state_dir"/*
  printf '%s\n' "$state_dir" >"$STATE_ROOT/latest"
}

restore_configuration() {
  local restore_dir="${1:-}"
  [[ -n "$restore_dir" && -d "$restore_dir" && "$restore_dir" == "$STATE_ROOT"/* ]] || fail ROLLBACK_STATE_INVALID
  rm -f -- "$ENABLED"
  if [[ -f "$restore_dir/vhost.before" ]]; then install -m 0600 "$restore_dir/vhost.before" "$VHOST"; else rm -f -- "$VHOST"; fi
  if [[ -f "$restore_dir/enabled.target" ]]; then ln -s "$(cat "$restore_dir/enabled.target")" "$ENABLED"; fi
  nginx -t || fail ROLLBACK_NGINX_CONFIG_INVALID
  systemctl reload nginx || fail ROLLBACK_RELOAD_FAILED
  printf 'DISPLAY09_TLS_ROLLBACK=PASS state=%s\n' "$restore_dir"
}

rollback_on_error() {
  local exit_code=$?
  cleanup_http01_probe
  if [[ "$MODE" == APPLY && "$changed" == true && -n "$state_dir" ]]; then
    set +e
    restore_configuration "$state_dir"
    set -e
  fi
  exit "$exit_code"
}

issue_certificate() {
  require_command certbot
  local account_args=()
  if [[ -n "${CERTBOT_ACCOUNT_EMAIL:-}" ]]; then
    account_args=(--email "$CERTBOT_ACCOUNT_EMAIL")
  else
    certbot show_account >/dev/null 2>&1 || fail CERTBOT_EXISTING_ACCOUNT_REQUIRED
  fi
  case "${DISPLAY_ACME_METHOD:-}" in
    HTTP01)
      require_pass DISPLAY_DNS_VERIFIED
      certbot certonly --webroot -w "$ACME_WEBROOT" -d "$DOMAIN" --cert-name "$DOMAIN" \
        --non-interactive --agree-tos "${account_args[@]}" --keep-until-expiring \
        --deploy-hook 'systemctl reload nginx'
      ;;
    DNS01)
      [[ "${CERTBOT_DNS_PLUGIN:-}" == cloudflare ]] || fail DNS01_PLUGIN_NOT_APPROVED
      [[ -f "${CERTBOT_DNS_CREDENTIALS_FILE:-}" && ! -L "${CERTBOT_DNS_CREDENTIALS_FILE:-}" ]] || fail DNS01_CREDENTIALS_INVALID
      [[ "$(stat -c '%a' "$CERTBOT_DNS_CREDENTIALS_FILE")" =~ ^(400|600)$ ]] || fail DNS01_CREDENTIALS_PERMISSIONS_INVALID
      certbot certonly --dns-cloudflare --dns-cloudflare-credentials "$CERTBOT_DNS_CREDENTIALS_FILE" \
        -d "$DOMAIN" --cert-name "$DOMAIN" --non-interactive --agree-tos "${account_args[@]}" \
        --keep-until-expiring --deploy-hook 'systemctl reload nginx'
      ;;
    *) fail ACME_METHOD_NOT_APPROVED ;;
  esac
  [[ -s "$CERT_DIR/fullchain.pem" && -s "$CERT_DIR/privkey.pem" ]] || fail CERTIFICATE_NOT_ISSUED
  openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -checkend 2592000 >/dev/null || fail CERTIFICATE_EXPIRY_INVALID
  openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -ext subjectAltName | grep -Fq "DNS:$DOMAIN" || fail CERTIFICATE_SAN_INVALID
}

verify_sni() {
  local host
  for host in "${TARGETS[@]}"; do
    timeout 10 openssl s_client -connect 127.0.0.1:443 -servername "$host" -verify_hostname "$host" -verify_return_error </dev/null 2>&1 | grep -q 'Verify return code: 0' || fail "SNI_${host//./_}_INVALID"
  done
}

verify_public_player() {
  local path="${DISPLAY_PLAYER_TEST_PATH:-}"
  [[ "$path" =~ ^/d/[A-Za-z0-9_-]{16,128}$ ]] || fail PLAYER_TEST_PATH_REQUIRED
  local headers body
  headers="$(mktemp)"; body="$(mktemp)"; chmod 0600 "$headers" "$body"
  if ! curl --fail --silent --show-error --max-time 15 -D "$headers" -o "$body" "https://$DOMAIN$path"; then
    rm -f -- "$headers" "$body"
    fail PLAYER_ROUTE_FAILED
  fi
  grep -Eqi '^cache-control:.*no-store' "$headers" || { rm -f -- "$headers" "$body"; fail PLAYER_NO_STORE_MISSING; }
  grep -Eqi '^content-security-policy:' "$headers" || { rm -f -- "$headers" "$body"; fail PLAYER_CSP_MISSING; }
  if grep -Eqi '^set-cookie:' "$headers"; then
    grep -Eqi '^set-cookie:.*Secure' "$headers" || { rm -f -- "$headers" "$body"; fail PLAYER_COOKIE_NOT_SECURE; }
    grep -Eqi '^set-cookie:.*SameSite' "$headers" || { rm -f -- "$headers" "$body"; fail PLAYER_COOKIE_SAMESITE_MISSING; }
  fi
  rm -f -- "$headers" "$body"
}

validate_common

case "$MODE" in
  PLAN)
    printf 'DISPLAY09_TLS_PLAN=PASS domain=%s upstream=127.0.0.1:3003 mutation=false\n' "$DOMAIN"
    ;;
  APPLY)
    require_origin_change_authority
    require_pass DISPLAY_DNS_CHANGE_AUTHORIZED
    require_command nginx; require_command openssl; require_command systemctl; require_command flock
    exec 9>"$LOCK_FILE"; flock --nonblock 9 || fail DEPLOYMENT_LOCK_BUSY
    nginx -t || fail NGINX_PRECHECK_FAILED
    backup_configuration
    trap rollback_on_error ERR
    changed=true
    mkdir -p "$AVAILABLE_DIR" "$ENABLED_DIR"
    render_vhost "$state_dir/vhost.candidate"
    if [[ "${DISPLAY_ACME_METHOD:-}" == HTTP01 ]]; then
      prepare_acme_webroot
      awk 'BEGIN{https=0} /^server \{/ {blocks++} blocks==2 {https=1} !https {print}' "$state_dir/vhost.candidate" >"$VHOST"
      chmod 0600 "$VHOST"; ln -sfn "$VHOST" "$ENABLED"; nginx -t; systemctl reload nginx
      probe_http01
    fi
    issue_certificate
    install -m 0600 "$state_dir/vhost.candidate" "$VHOST"
    ln -sfn "$VHOST" "$ENABLED"
    nginx -t || fail NGINX_CANDIDATE_INVALID
    systemctl reload nginx || fail NGINX_RELOAD_FAILED
    verify_sni
    trap - ERR
    printf 'DISPLAY09_TLS_APPLY=PASS state=%s\n' "$state_dir"
    ;;
  VERIFY)
    require_command nginx; require_command openssl; require_command curl; require_command certbot
    nginx -t || fail NGINX_VERIFY_FAILED
    verify_sni
    verify_public_player
    certbot renew --dry-run --cert-name "$DOMAIN" >/dev/null || fail CERTBOT_DRY_RUN_FAILED
    printf 'DISPLAY09_TLS_VERIFY=PASS\n'
    ;;
  ROLLBACK)
    require_pass DISPLAY_TLS_ROLLBACK_AUTHORIZED
    require_command nginx; require_command systemctl; require_command flock
    exec 9>"$LOCK_FILE"; flock --nonblock 9 || fail DEPLOYMENT_LOCK_BUSY
    restore_configuration "${DISPLAY09_TLS_ROLLBACK_STATE:-$(cat "$STATE_ROOT/latest" 2>/dev/null || true)}"
    ;;
esac
