#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
pushd "$ROOT_DIR" >/dev/null

if ! command -v pip >/dev/null 2>&1; then
  echo "pip not found; please install Python 3.11 and pip" >&2
  exit 1
fi

for d in connectors/python/*; do
  if [ -f "$d/requirements.txt" ]; then
    echo "Vendoring deps for $d"
    pip install -r "$d/requirements.txt" -t "$d"
  fi
done

echo "Done vendoring dependencies."

popd >/dev/null
