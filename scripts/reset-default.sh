#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE_FILE="$ROOT_DIR/.default-baseline"

if [ ! -f "$BASELINE_FILE" ]; then
  echo "Error: baseline file not found at $BASELINE_FILE"
  exit 1
fi

BASELINE_COMMIT="$(awk -F= '/^commit=/{print $2}' "$BASELINE_FILE" | tr -d '[:space:]')"

if [ -z "$BASELINE_COMMIT" ]; then
  echo "Error: commit is empty in $BASELINE_FILE"
  exit 1
fi

cd "$ROOT_DIR"

if ! git rev-parse --verify "$BASELINE_COMMIT^{commit}" >/dev/null 2>&1; then
  echo "Error: baseline commit not found locally: $BASELINE_COMMIT"
  exit 1
fi

echo "Resetting repository to default baseline: $BASELINE_COMMIT"
git reset --hard "$BASELINE_COMMIT"
git clean -fd
echo "Done. Repository restored to default baseline."
