#!/usr/bin/env bash
# Build l'APK Android de mobile/ (100% local, cf. CLAUDE.md).
# Usage: ./build-mobile.sh [debug|release]   (release par défaut)
set -euo pipefail

MODE="${1:-release}"
if [[ "$MODE" != "debug" && "$MODE" != "release" ]]; then
  echo "Usage: $0 [debug|release]" >&2
  exit 1
fi

cd "$(dirname "$0")/mobile"

flutter pub get
flutter build apk --"$MODE"

APK_PATH="build/app/outputs/flutter-apk/app-$MODE.apk"
echo ""
echo "✓ APK généré : mobile/$APK_PATH"
