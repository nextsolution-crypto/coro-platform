#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

temporary_paths=()
cleanup() {
  if (( ${#temporary_paths[@]} )); then rm -f -- "${temporary_paths[@]}"; fi
}
trap cleanup EXIT

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
  tmp="$(mktemp /tmp/display09-origin-cert.XXXXXX)"
  chmod 0600 "$tmp"
  temporary_paths+=("$tmp")
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
  rm -f "$tmp"
  item="{\"hostname\":\"$(json_escape "$host")\",\"inspection\":\"$status\",\"hostnameValidation\":\"$verify\",\"subject\":\"$(json_escape "$subject")\",\"issuer\":\"$(json_escape "$issuer")\",\"notBefore\":\"$(json_escape "$start")\",\"notAfter\":\"$(json_escape "$end")\",\"sha256Fingerprint\":\"$(json_escape "$fingerprint")\",\"sans\":\"$(json_escape "$sans")\"}"
  matrix="${matrix}${matrix:+,}${item}"
done

nginx_state="ABSENT"
nginx_files=""
nginx_directives=""
http01_static_location=false
if command_exists nginx; then
  nginx_state="PRESENT"
  nginx -t >/dev/null 2>&1 || nginx_state="PRESENT_CONFIG_INVALID"
  nginx_dump="$(mktemp /tmp/display09-nginx-effective.XXXXXX)"
  chmod 0600 "$nginx_dump"
  temporary_paths+=("$nginx_dump")
  if nginx -T >"$nginx_dump" 2>&1; then
    nginx_files="$(sed -n 's/^# configuration file \([^:]*\):$/\1/p' "$nginx_dump" | grep -E '^/etc/nginx/(nginx\.conf|conf\.d/|sites-enabled/|snippets/)' | sort -u | paste -sd '|' -)"
    nginx_directives="$(awk '
      /^# configuration file / { file=$0; sub(/^# configuration file /,"",file); sub(/:$/,"",file); next }
      /^[[:space:]]*(listen|server_name|ssl_certificate|proxy_pass)[[:space:]]/ {
        line=$0; sub(/^[[:space:]]*/,"",line); sub(/[[:space:]]*;[[:space:]]*$/,"",line);
        if (line !~ /^ssl_certificate_key[[:space:]]/) print file "::" line
      }
    ' "$nginx_dump" | sort -u | paste -sd '|' -)"
    if grep -Eiq '^[[:space:]]*location([[:space:]]+\^~)?[[:space:]]+/?\.well-known/acme-challenge([/{[:space:]]|$)' "$nginx_dump"; then
      http01_static_location=true
    fi
  fi
  rm -f "$nginx_dump"
fi

certbot_profiles=""
if [[ -d /etc/letsencrypt/renewal ]]; then
  while IFS= read -r renewal_file; do
    name="$(basename "$renewal_file" .conf)"
    domains="$(sed -n 's/^[[:space:]]*domains[[:space:]]*=[[:space:]]*//p' "$renewal_file" | head -n1)"
    authenticator="$(sed -n 's/^[[:space:]]*authenticator[[:space:]]*=[[:space:]]*//p' "$renewal_file" | head -n1)"
    installer="$(sed -n 's/^[[:space:]]*installer[[:space:]]*=[[:space:]]*//p' "$renewal_file" | head -n1)"
    pre=false; post=false; deploy=false
    grep -Eq '^[[:space:]]*pre_hook[[:space:]]*=' "$renewal_file" && pre=true
    grep -Eq '^[[:space:]]*post_hook[[:space:]]*=' "$renewal_file" && post=true
    grep -Eq '^[[:space:]]*renew_hook[[:space:]]*=|^[[:space:]]*deploy_hook[[:space:]]*=' "$renewal_file" && deploy=true
    profile="$(json_escape "$renewal_file")::name=$(json_escape "$name")::domains=$(json_escape "$domains")::authenticator=$(json_escape "$authenticator")::installer=$(json_escape "$installer")::preHook=$pre::postHook=$post::deployHook=$deploy"
    certbot_profiles="${certbot_profiles}${certbot_profiles:+|}${profile}"
  done < <(find /etc/letsencrypt/renewal -maxdepth 1 -type f -name '*.conf' -print | sort)
fi
http01_certbot_plugin=false
if [[ "$certbot_profiles" == *"authenticator=nginx"* || "$certbot_profiles" == *"authenticator=webroot"* ]]; then
  http01_certbot_plugin=true
fi

timer_details="NOT_VERIFIED"
if command_exists systemctl && systemctl show certbot.timer >/dev/null 2>&1; then
  timer_details="$(systemctl show certbot.timer -p Id -p ActiveState -p UnitFileState -p NextElapseUSecRealtime --value 2>/dev/null | paste -sd '|' -)"
fi

origin_fingerprint="NOT_VERIFIED"
if command_exists curl; then
  origin_address="$(curl --silent --show-error --max-time 2 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null || true)"
  if [[ "$origin_address" =~ ^[0-9a-fA-F:.]+$ ]]; then origin_fingerprint="$(printf '%s' "$origin_address" | sha256sum | cut -d' ' -f1)"; fi
fi

http01_dns=false
getent ahosts display.getcoro.io >/dev/null 2>&1 && http01_dns=true
http01_listener=false
if command_exists ss && ss -H -ltn '( sport = :80 )' 2>/dev/null | grep -q .; then http01_listener=true; fi
http01_challenge=false
if [[ "$http01_static_location" == true || "$http01_certbot_plugin" == true ]]; then http01_challenge=true; fi

printf '{"schemaVersion":1,"discoveryVersion":2,"execution":"PASS","readOnly":true,"listener443":"%s","terminator":"%s","nginx":"%s","renewal":"%s","nginxConfigFiles":"%s","nginxWhitelistedDirectives":"%s","certbotProfiles":"%s","certbotTimer":"%s","serverOriginFingerprint":"%s","acme":{"http01DnsPresent":%s,"http01ListenerPresent":%s,"http01StaticLocationPresent":%s,"http01CertbotPluginPresent":%s,"http01ChallengeConfigured":%s,"dns01CredentialAvailability":"NOT_VERIFIED"},"certificates":[%s]}\n' \
  "$listener" "$terminator" "$nginx_state" "$renewal" "$(json_escape "$nginx_files")" "$(json_escape "$nginx_directives")" "$(json_escape "$certbot_profiles")" "$(json_escape "$timer_details")" "$origin_fingerprint" "$http01_dns" "$http01_listener" "$http01_static_location" "$http01_certbot_plugin" "$http01_challenge" "$matrix"
