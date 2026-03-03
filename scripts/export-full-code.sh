#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist"
TS="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$OUT_DIR/taxiweb-full-source-$TS.tar.gz"

mkdir -p "$OUT_DIR"

tar \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./dist' \
  -czf "$ARCHIVE" \
  -C "$ROOT_DIR" .

echo "Archive created: $ARCHIVE"
