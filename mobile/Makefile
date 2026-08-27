# Raccourcis de build Android pour mobile/ — wrapper autour de scripts/build-android.sh.
#
# Cible les shells Unix (Linux, macOS, WSL/Ubuntu, Git Bash sur Windows). Sous PowerShell natif
# (sans WSL ni Git Bash), `make` n'est généralement pas installé — utilise directement
# scripts/build-android.ps1 dans ce cas (voir docs/BUILD.md).
#
# Exemples :
#   make debug                                   # APK debug, arm64-v8a, installe rien
#   make release                                 # APK release, arm64-v8a
#   make install                                 # build release + install sur le device détecté
#   make install MODE=debug                      # build debug + install
#   make release API_BASE_URL=http://10.0.2.2:5173
#   make all-archs                               # build release, les 4 ABI

SHELL := /usr/bin/env bash
MODE ?= release
ARCH ?= arm64-v8a
API_BASE_URL ?=

BUILD := ./scripts/build-android.sh --arch $(ARCH) $(if $(API_BASE_URL),--api-base-url $(API_BASE_URL),)

.PHONY: prebuild debug release all-archs install clean logcat devices help

help:
	@echo "Cibles : prebuild, debug, release, all-archs, install, clean, logcat, devices"
	@echo "Variables : MODE=debug|release  ARCH=<abi>|all  API_BASE_URL=<url>"

prebuild:
	npx expo prebuild -p android

debug:
	$(BUILD) --debug

release:
	$(BUILD) --release

all-archs:
	./scripts/build-android.sh --$(MODE) --all-archs $(if $(API_BASE_URL),--api-base-url $(API_BASE_URL),)

install:
	$(BUILD) --$(MODE) --install

clean:
	cd android && ./gradlew clean

logcat:
	adb logcat | grep -i crystalmiaou

devices:
	adb devices
