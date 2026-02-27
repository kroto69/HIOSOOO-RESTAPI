#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_BIN="$ROOT_DIR/olt-api"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but not found in PATH."
  exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: frontend directory not found at $FRONTEND_DIR"
  exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm --prefix "$FRONTEND_DIR" install
fi

need_build_backend=0
if [ ! -x "$BACKEND_BIN" ]; then
  need_build_backend=1
elif find "$ROOT_DIR/cmd" "$ROOT_DIR/internal" "$ROOT_DIR/pkg" -name "*.go" -newer "$BACKEND_BIN" | head -n 1 | grep -q .; then
  need_build_backend=1
elif [ "$ROOT_DIR/go.mod" -nt "$BACKEND_BIN" ] || [ "$ROOT_DIR/go.sum" -nt "$BACKEND_BIN" ]; then
  need_build_backend=1
fi

if [ "$need_build_backend" -eq 1 ]; then
  if ! command -v go >/dev/null 2>&1; then
    echo "Error: backend binary not found and Go is not installed."
    echo "Build backend first with ./scripts/install.sh or install Go."
    exit 1
  fi

  echo "Building backend binary..."
  (cd "$ROOT_DIR" && go build -o "$BACKEND_BIN" ./cmd/server)
fi

cleanup() {
  echo
  echo "Stopping backend and frontend..."

  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi

  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting backend (port follows configs/config.yaml or SERVER_PORT env; default 3000)"
"$BACKEND_BIN" &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173"
npm --prefix "$FRONTEND_DIR" run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

wait -n "$BACKEND_PID" "$FRONTEND_PID"
