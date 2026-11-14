#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
library="$(sed '/^validate_common$/,$d' "$script_dir/display09-origin-tls-change.sh")"

run_case() (
  eval "$library"
  probe_dir="$(mktemp -d)"
  trap 'rm -f -- "$probe_dir/expected" "$probe_dir/headers" "$probe_dir/body"; rmdir "$probe_dir"' EXIT
  printf '%s' 'EXPECTED-WITNESS' >"$probe_dir/expected"

  curl() {
    local headers='' body=''
    while [[ $# -gt 0 ]]; do
      case "$1" in
        -D) headers="$2"; shift 2 ;;
        -o) body="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    printf 'HTTP/1.1 %s Test\r\n' "${MOCK_STATUS:-200}" >"$headers"
    [[ "${MOCK_REDIRECT:-false}" != true ]] || printf 'Location: https://display.getcoro.io/redirected\r\n' >>"$headers"
    printf '\r\n' >>"$headers"
    printf '%s' "${MOCK_BODY:-EXPECTED-WITNESS}" >"$body"
  }

  probe_http_response TEST "$probe_dir/expected" http://display.getcoro.io/.well-known/acme-challenge/test
)

MOCK_STATUS=200 MOCK_BODY=EXPECTED-WITNESS run_case
if MOCK_STATUS=404 MOCK_BODY=EXPECTED-WITNESS run_case; then exit 1; fi
if MOCK_STATUS=200 MOCK_BODY=SUBSTITUTED run_case; then exit 1; fi
if MOCK_STATUS=200 MOCK_BODY=EXPECTED-WITNESS MOCK_REDIRECT=true run_case; then exit 1; fi
printf '%s\n' 'DISPLAY09_HTTP01_RESPONSE_TESTS=PASS positive=1 negative=3'
