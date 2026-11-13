#!/usr/bin/env bash
set -Eeuo pipefail

# Read-only origin inspection. The output is deliberately limited to service names,
# certificate metadata and booleans; private keys and environment values are never read.
TARGETS=(getcoro.io client.getcoro.io api.getcoro.io app.getcoro.io display.getcoro.io)

command_exists() { command -v "$1" >/dev/null 2>&1; }
json_escape() { sed 's/\\/\\\\/g; s/"/\\"/g; s/\r//g' <<<"$1" | tr -d '\n'; }

listener="NOT_VERIFIED"
terminator="UNKNOWN"
if command_exists ss; then
  listener_line="$(ss -H -ltnp '( sport = :443 )' 2>/dev/null | head -n 1 || true)"
  [[ -n "$listener_line" ]] && listener="PRESENT"
  case "${listener_line,,}" in
    *nginx*) terminator="NGINX" ;;
    *traefik*) terminator="TRAEFIK" ;;
    *caddy*) terminator="CADDY" ;;
    *apache*|*httpd*) terminator="APACHE" ;;
    *docker-proxy*) terminator="DOCKER_PROXY" ;;
  esac
fi

renewal="NOT_VERIFIED"
if command_exists systemctl; then
  if systemctl list-timers --all --no-legend 2>/dev/null | grep -Eiq 'certbot|acme|letsencrypt'; then renewal="TIMER_PRESENT"; fi
fi

matrix=""
for host in "${TARGETS[@]}"; do
  status="NOT_VERIFIED"; subject=""; issuer=""; start=""; end=""; fingerprint=""; sans=""; verify="NOT_VERIFIED"
  tmp="$(mktemp)"; trap 'rm -f "$tmp"' RETURN
  if timeout 10 openssl s_client -connect 127.0.0.1:443 -servername "$host" -showcerts </dev/null >"$tmp" 2>/dev/null; then
    subject="$(openssl x509 -in "$tmp" -noout -subject 2>/dev/null | sed 's/^subject=//')"
    issuer="$(openssl x509 -in "$tmp" -noout -issuer 2>/dev/null | sed 's/^issuer=//')"
    start="$(openssl x509 -in "$tmp" -noout -startdate 2>/dev/null | sed 's/^notBefore=//')"
    end="$(openssl x509 -in "$tmp" -noout -enddate 2>/dev/null | sed 's/^notAfter=//')"
    fingerprint="$(openssl x509 -in "$tmp" -noout -fingerprint -sha256 2>/dev/null | sed 's/^sha256 Fingerprint=//I')"
    sans="$(openssl x509 -in "$tmp" -noout -ext subjectAltName 2>/dev/null | tail -n +2 | tr -d '\n' | sed 's/^[[:space:]]*//')"
    if openssl s_client -connect 127.0.0.1:443 -servername "$host" -verify_hostname "$host" -verify_return_error </dev/null 2>&1 | grep -q 'Verify return code: 0'; then verify="PASS"; else verify="FAIL"; fi
    status="PASS"
  fi
  rm -f "$tmp"; trap - RETURN
  item="{\"hostname\":\"$(json_escape "$host")\",\"inspection\":\"$status\",\"hostnameValidation\":\"$verify\",\"subject\":\"$(json_escape "$subject")\",\"issuer\":\"$(json_escape "$issuer")\",\"notBefore\":\"$(json_escape "$start")\",\"notAfter\":\"$(json_escape "$end")\",\"sha256Fingerprint\":\"$(json_escape "$fingerprint")\",\"sans\":\"$(json_escape "$sans")\"}"
  matrix="${matrix}${matrix:+,}${item}"
done

nginx_state="ABSENT"
if command_exists nginx; then
  nginx_state="PRESENT"
  nginx -t >/dev/null 2>&1 || nginx_state="PRESENT_CONFIG_INVALID"
fi

printf '{"schemaVersion":1,"execution":"PASS","readOnly":true,"listener443":"%s","terminator":"%s","nginx":"%s","renewal":"%s","certificates":[%s]}\n' \
  "$listener" "$terminator" "$nginx_state" "$renewal" "$matrix"
