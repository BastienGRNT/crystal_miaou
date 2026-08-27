#!/usr/bin/env bash
# Build l'APK Android de mobile/ — 100% local (expo prebuild + Gradle), jamais EAS Build.
# Fonctionne sous Linux, macOS, WSL (Ubuntu) et Git Bash sur Windows.
#
# Usage :
#   ./scripts/build-android.sh [--debug|--release] [--arch <abi>|--all-archs]
#                               [--api-base-url <url>] [--install] [--prebuild]
#
# Voir docs/BUILD.md pour le détail des prérequis (Node, JDK, Android SDK) par OS.
set -euo pipefail

MODE="release"
ARCH="arm64-v8a"
API_BASE_URL=""
DO_INSTALL=0
DO_PREBUILD=0

usage() {
	cat <<'EOF'
Usage: ./scripts/build-android.sh [options]

  --debug              Build de debug (rapide, non optimisée, installable directement)
  --release            Build de release (par défaut) — cible l'API de prod sauf --api-base-url
  --arch <abi>         Limite le build à une seule ABI (défaut: arm64-v8a — couvre la quasi-totalité
                        des téléphones réels). Réduit fortement la taille de l'APK.
  --all-archs          Build les 4 ABI (arm64-v8a, armeabi-v7a, x86, x86_64) — APK bien plus gros,
                        utile seulement pour un émulateur x86_64 ou une distribution multi-device.
  --api-base-url <url> Fixe API_BASE_URL au moment du build (voir app.config.ts). Sans cette option,
                        release cible https://miaou.bastiengrnt.fr, debug aussi (même règle) —
                        toujours passer --api-base-url http://10.0.2.2:5173 (émulateur) ou l'IP LAN
                        de la machine (device physique) pour développer contre un `npm run dev` local.
  --prebuild           Force `expo prebuild -p android` avant le build (sinon fait une seule fois,
                        seulement si android/ n'existe pas encore).
  --install            Installe l'APK buildé sur le device/émulateur détecté par adb (adb install -r).
  -h, --help           Affiche cette aide.
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--debug) MODE="debug"; shift ;;
		--release) MODE="release"; shift ;;
		--arch) ARCH="$2"; shift 2 ;;
		--all-archs) ARCH="all"; shift ;;
		--api-base-url) API_BASE_URL="$2"; shift 2 ;;
		--install) DO_INSTALL=1; shift ;;
		--prebuild) DO_PREBUILD=1; shift ;;
		-h|--help) usage; exit 0 ;;
		*) echo "Option inconnue : $1" >&2; usage; exit 1 ;;
	esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$MOBILE_DIR"

if [[ -n "$API_BASE_URL" ]]; then
	export API_BASE_URL
	echo "API_BASE_URL=$API_BASE_URL"
fi

if [[ "$DO_PREBUILD" -eq 1 || ! -d "$MOBILE_DIR/android" ]]; then
	echo "→ Génération du projet natif Android (expo prebuild)..."
	npx expo prebuild -p android
fi

cd "$MOBILE_DIR/android"
chmod +x ./gradlew

if [[ "$MODE" == "debug" ]]; then
	GRADLE_TASK="assembleDebug"
else
	GRADLE_TASK="assembleRelease"
fi

echo "→ Build $MODE (arch=$ARCH)..."
if [[ "$ARCH" == "all" ]]; then
	./gradlew "$GRADLE_TASK" --console=plain
else
	./gradlew "$GRADLE_TASK" -PreactNativeArchitectures="$ARCH" --console=plain
fi

APK_PATH="$MOBILE_DIR/android/app/build/outputs/apk/$MODE/app-$MODE.apk"
echo ""
echo "✓ APK généré : $APK_PATH"

if [[ "$DO_INSTALL" -eq 1 ]]; then
	if ! command -v adb >/dev/null 2>&1; then
		echo "✗ adb introuvable dans le PATH — voir docs/BUILD.md section adb." >&2
		exit 1
	fi
	if ! adb devices | grep -qE "device$"; then
		echo "✗ Aucun device/émulateur détecté par adb (adb devices)." >&2
		if grep -qi microsoft /proc/version 2>/dev/null; then
			echo "  Tu es sous WSL : voir docs/BUILD.md section 'Linux / WSL (Ubuntu)' pour connecter un" >&2
			echo "  device (usbipd-win pour l'USB, ou adb connect <ip>:5555 en Wi-Fi)." >&2
		fi
		exit 1
	fi
	echo "→ Installation sur le device..."
	adb install -r "$APK_PATH"
fi
