<#
.SYNOPSIS
  Build l'APK Android de mobile/ — 100% local (expo prebuild + Gradle), jamais EAS Build.

.DESCRIPTION
  Equivalent Windows de scripts/build-android.sh. Voir docs/BUILD.md pour le détail des
  prérequis (Node, JDK, Android SDK).

.PARAMETER Mode
  'debug' ou 'release' (défaut : release).

.PARAMETER Arch
  ABI ciblée (défaut : arm64-v8a — couvre la quasi-totalité des téléphones réels). Passer 'all'
  pour builder les 4 ABI (APK bien plus gros, utile pour un émulateur x86_64 par exemple).

.PARAMETER ApiBaseUrl
  Fixe API_BASE_URL au moment du build (voir app.config.ts). Sans cette option, la build cible
  https://miaou.bastiengrnt.fr — toujours la passer (ex: http://10.0.2.2:5173 pour l'émulateur)
  pour développer contre un `npm run dev` local.

.PARAMETER Prebuild
  Force `expo prebuild -p android` avant le build (sinon fait une seule fois, seulement si
  android/ n'existe pas encore).

.PARAMETER Install
  Installe l'APK buildé sur le device/émulateur détecté par adb (adb install -r).

.EXAMPLE
  ./scripts/build-android.ps1 -Mode release -Arch arm64-v8a -Install

.EXAMPLE
  ./scripts/build-android.ps1 -Mode debug -ApiBaseUrl http://10.0.2.2:5173 -Install
#>
param(
	[ValidateSet('debug', 'release')]
	[string]$Mode = 'release',

	[string]$Arch = 'arm64-v8a',

	[string]$ApiBaseUrl = '',

	[switch]$Prebuild,

	[switch]$Install
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MobileDir = Split-Path -Parent $ScriptDir
Set-Location $MobileDir

if ($ApiBaseUrl -ne '') {
	$env:API_BASE_URL = $ApiBaseUrl
	Write-Host "API_BASE_URL=$ApiBaseUrl"
}

if ($Prebuild -or -not (Test-Path (Join-Path $MobileDir 'android'))) {
	Write-Host "-> Generation du projet natif Android (expo prebuild)..."
	npx expo prebuild -p android
	if ($LASTEXITCODE -ne 0) { throw "expo prebuild a echoue." }
}

Set-Location (Join-Path $MobileDir 'android')

$GradleTask = if ($Mode -eq 'debug') { 'assembleDebug' } else { 'assembleRelease' }

Write-Host "-> Build $Mode (arch=$Arch)..."
if ($Arch -eq 'all') {
	& ./gradlew.bat $GradleTask --console=plain
} else {
	& ./gradlew.bat $GradleTask "-PreactNativeArchitectures=$Arch" --console=plain
}
if ($LASTEXITCODE -ne 0) { throw "Le build Gradle a echoue." }

$ApkPath = Join-Path $MobileDir "android\app\build\outputs\apk\$Mode\app-$Mode.apk"
Write-Host ""
Write-Host "APK genere : $ApkPath" -ForegroundColor Green

if ($Install) {
	$adb = Get-Command adb -ErrorAction SilentlyContinue
	if (-not $adb) {
		Write-Error "adb introuvable dans le PATH - voir docs/BUILD.md section adb."
		exit 1
	}
	$devices = & adb devices
	if (-not ($devices -match "device$")) {
		Write-Error "Aucun device/emulateur detecte par adb (adb devices)."
		exit 1
	}
	Write-Host "-> Installation sur le device..."
	& adb install -r $ApkPath
}
