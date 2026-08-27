#!/usr/bin/env bash
# Build l'APK Android de flutter_mobile/ (app legacy, conservée pour référence — cf. CLAUDE.md).
# L'app mobile activement développée est désormais mobile/ (React Native), voir build-mobile.sh.
# Usage: ./build-flutter-mobile.sh [debug|release]   (release par défaut)
set -euo pipefail

MODE="${1:-release}"
if [[ "$MODE" != "debug" && "$MODE" != "release" ]]; then
  echo "Usage: $0 [debug|release]" >&2
  exit 1
fi

cd "$(dirname "$0")/flutter_mobile"

flutter pub get
flutter build apk --"$MODE"

APK_PATH="build/app/outputs/flutter-apk/app-$MODE.apk"
echo ""
echo "✓ APK généré : flutter_mobile/$APK_PATH"
