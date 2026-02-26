#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROXY_LOG="${ROOT_DIR}/.ccproxy.log"
PROXY_PID_FILE="${ROOT_DIR}/.ccproxy.pid"
PROXY_PORT_FILE="${ROOT_DIR}/.ccproxy.port"

find_ccproxy_port() {
  ss -lntp 2>/dev/null | awk '/ccproxy/ {print $4}' | sed 's/.*://' | head -n 1
}

start_ccproxy() {
  if command -v ccproxy >/dev/null 2>&1; then
    if pgrep -f "ccproxy serve" >/dev/null 2>&1; then
      local existing_port
      existing_port="$(find_ccproxy_port || true)"
      if [[ -n "${existing_port}" ]]; then
        echo "CCProxy already running on port ${existing_port}."
        echo "${existing_port}" > "${PROXY_PORT_FILE}"
        return 0
      fi
    fi

    echo "Starting CCProxy (SDK mode)..."
    # Disable claude_api to avoid CLI header-capture mode; use claude_sdk routes instead.
    # Force plugin selection to avoid claude_api header-capture mode.
    ENABLED_PLUGINS='["claude_sdk"]' \
      nohup ccproxy serve --host 127.0.0.1 --port 8000 --log-level WARNING > "${PROXY_LOG}" 2>&1 &
    echo $! > "${PROXY_PID_FILE}"

    local tries=0
    local port=""
    until [[ -n "${port}" || ${tries} -ge 20 ]]; do
      sleep 0.2
    port="$(find_ccproxy_port || true)"
      tries=$((tries + 1))
    done

    if [[ -z "${port}" ]]; then
      echo "Failed to detect CCProxy port. Check ${PROXY_LOG}." >&2
      return 1
    fi

    echo "${port}" > "${PROXY_PORT_FILE}"
    echo "CCProxy listening on port ${port}."
  else
    echo "ccproxy is not installed. Run: uv tool install ccproxy-api" >&2
    return 1
  fi
}

cleanup() {
  if [[ -f "${PROXY_PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PROXY_PID_FILE}")"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" || true
    fi
  fi
}

trap cleanup EXIT

start_ccproxy

PROXY_PORT="$(cat "${PROXY_PORT_FILE}")"
export ANTHROPIC_BASE_URL="http://127.0.0.1:${PROXY_PORT}/claude/sdk"
export ANTHROPIC_API_KEY="local-proxy"

echo "Starting Meta Ads Manager with ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL}"
cd "${ROOT_DIR}"
exec node server.js
