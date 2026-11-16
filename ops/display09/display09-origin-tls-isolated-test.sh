#!/bin/sh
set -eu

template=${1:-/workspace/display.getcoro.io.conf.template}
test -f "$template"
command -v openssl >/dev/null 2>&1
command -v curl >/dev/null 2>&1
mkdir -p /etc/letsencrypt/live/display.getcoro.io
install -d -m 0755 /var/www/letsencrypt /var/www/letsencrypt/.well-known /var/www/letsencrypt/.well-known/acme-challenge
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -subj '/CN=display.getcoro.io' \
  -keyout /etc/letsencrypt/live/display.getcoro.io/privkey.pem \
  -out /etc/letsencrypt/live/display.getcoro.io/fullchain.pem
sed 's#__ACME_WEBROOT__#/var/www/letsencrypt#g' "$template" >/etc/nginx/conf.d/display.conf
cat >/etc/nginx/conf.d/display-test-upstream.conf <<'EOF'
server {
  listen 127.0.0.1:3003;
  server_name _;
  location = /_next/static/chunks/player-test.js {
    default_type application/javascript;
    return 200 'CORO-DISPLAY-PLAYER-STATIC';
  }
  location / { return 404; }
}
EOF
grep -q 'server_name display.getcoro.io;' /etc/nginx/conf.d/display.conf
grep -q 'proxy_pass http://127.0.0.1:3003;' /etc/nginx/conf.d/display.conf
nginx -t
expected='CORO-DISPLAY09-ISOLATED-PROBE'
printf '%s' "$expected" >/var/www/letsencrypt/.well-known/acme-challenge/witness
chmod 0644 /var/www/letsencrypt/.well-known/acme-challenge/witness
nginx
if HTTP_PROXY=http://127.0.0.1:9 http_proxy=http://127.0.0.1:9 \
  curl --silent --show-error --max-time 2 \
    --resolve display.getcoro.io:80:127.0.0.1 \
    http://display.getcoro.io/.well-known/acme-challenge/witness >/dev/null 2>&1; then
  printf '%s\n' 'proxy regression was not reproduced' >&2
  exit 1
fi
actual="$(HTTP_PROXY=http://127.0.0.1:9 http_proxy=http://127.0.0.1:9 \
  curl --silent --show-error --noproxy '*' \
    --resolve display.getcoro.io:80:127.0.0.1 \
    http://display.getcoro.io/.well-known/acme-challenge/witness)"
test "$actual" = "$expected"
static_expected='CORO-DISPLAY-PLAYER-STATIC'
static_actual="$(HTTP_PROXY=http://127.0.0.1:9 http_proxy=http://127.0.0.1:9 \
  curl --silent --show-error --noproxy '*' --insecure \
    --resolve display.getcoro.io:443:127.0.0.1 \
    https://display.getcoro.io/_next/static/chunks/player-test.js)"
test "$static_actual" = "$static_expected"
nginx -s quit
printf '%s\n' 'DISPLAY09_NGINX_ISOLATED_TEST=PASS ACME_LOCAL_HTTP=PASS PLAYER_STATIC_ROUTING=PASS proxy_environment_bypassed=true exact_body=true'
