#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE_FILE="$ROOT_DIR/.default-baseline"

cd "$ROOT_DIR"
COMMIT="$(git rev-parse --short=7 HEAD)"
BRANCH="$(git branch --show-current)"

cat > "$BASELINE_FILE" <<EOF
commit=$COMMIT
branch=$BRANCH
note=Default local baseline for "reset ke default"
EOF

echo "Default baseline updated:"
echo "  commit=$COMMIT"
echo "  branch=$BRANCH"
