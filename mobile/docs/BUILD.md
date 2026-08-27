# Builder l'APK Android — Windows & Linux/WSL (Ubuntu)

Toute la chaîne est 100% locale : `expo prebuild` génère un vrai projet Gradle (`android/`, committé),
buildé ensuite avec Gradle directement — **jamais EAS Build** (pas de dépendance cloud, pas d'attente).

Deux façons d'utiliser ce qui suit :
- Les scripts `scripts/build-android.sh` (Linux/macOS/WSL/Git Bash) et
  `scripts/build-android.ps1` (PowerShell) automatisent tout ce qui est décrit ici — voir
  [Utiliser les scripts](#utiliser-les-scripts) si tu veux aller droit au but.
- Les sections **Windows** et **Linux / WSL (Ubuntu)** ci-dessous détaillent les commandes manuelles
  équivalentes, pour comprendre ce que les scripts font (ou dépanner quand ça ne marche pas).

---

## Windows

Ce sont exactement les commandes utilisées pour builder l'app cette session (testées, pas
seulement documentées).

### Prérequis

- **Node.js 20+** (`node -v`)
- **JDK 17** — un JDK Temurin/Microsoft fonctionne (`java -version`). Le SDK Android/Gradle de ce
  projet a été buildé et testé avec compileSdk 36 / build-tools 36.0.0 / NDK 27.1.12297006 (versions
  choisies automatiquement par le plugin Gradle Expo — pas besoin de les fixer à la main).
- **Android SDK** — le plus simple est d'installer Android Studio (qui pose le SDK et les licences
  tout seul), même si on ne s'en sert ensuite qu'en ligne de commande. SDK attendu ici :
  `%LOCALAPPDATA%\Android\Sdk`. Variables d'environnement utiles (souvent déjà posées par Android
  Studio) : `ANDROID_HOME` et `ANDROID_SDK_ROOT` pointant vers ce dossier, et
  `%LOCALAPPDATA%\Android\Sdk\platform-tools` dans le `PATH` (pour `adb`).
- Un **émulateur Android (AVD)** créé depuis Android Studio, ou un téléphone Android en debug USB.

### Commandes (Git Bash ou PowerShell)

```sh
cd mobile
npm install

# Une seule fois (ou après ajout d'un module natif / changement de app.config.ts touchant
# permissions/plugins/package name) : génère android/
npx expo prebuild -p android

cd android

# Build debug — rapide, non optimisée, installable directement
./gradlew assembleDebug          # Git Bash
./gradlew.bat assembleDebug      # PowerShell / cmd

# Build release — optimisée. -PreactNativeArchitectures limite à une seule ABI (voir plus bas
# pourquoi c'est important sur Windows en particulier)
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

APK généré dans `android/app/build/outputs/apk/<debug|release>/app-<debug|release>.apk`.

### Pourquoi limiter l'ABI (`-PreactNativeArchitectures=arm64-v8a`)

Sans cette option, Gradle build les 4 ABI (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`) dans le même
APK — un premier essai cette session a produit un **debug de 176 Mo**. `arm64-v8a` seul couvre la
quasi-totalité des **téléphones réels** vendus depuis ~2017 et suffit largement pour tester dessus ;
le **release équivalent ne fait que 35 Mo**.

⚠️ **Un APK buildé avec une seule ABI ne s'installe/ne se lance que sur un device de cette
architecture précise.** La plupart des émulateurs Android Studio tournent en **x86_64** (bien plus
rapide sur un PC x86 — c'est justement pourquoi ce guide recommande une image système x86_64 plus
bas). Un APK `arm64-v8a` installé dessus **s'installe sans erreur mais plante au lancement** avec
`SoLoaderDSONotFoundError: couldn't find DSO to load: libreactnative.so` (vécu en direct pendant la
rédaction de ce doc). Vérifie l'ABI de ta cible avant de choisir :

```sh
adb shell getprop ro.product.cpu.abi   # arm64-v8a sur un vrai téléphone, x86_64 sur la plupart des émulateurs
```

Puis fais correspondre `--arch`/`-Arch` à cette valeur (`--arch x86_64` pour l'émulateur ci-dessus),
ou utilise `--all-archs` si tu ne sais pas encore sur quoi tu vas installer (APK plus gros, mais
tourne partout).

### Dépannage Windows : `renaming ... Permission denied` / build qui traîne un lock de fichier

Android Studio garde en arrière-plan plusieurs process même projet fermé : le Dart/Kotlin language
server, le "flutter_tools daemon" (si `flutter_mobile/` est aussi ouvert), et surtout le **Gradle
Daemon** (`java.exe`, reste actif après un build pour accélérer le suivant). Ces process gardent des
fichiers ouverts sous `android/.gradle`, `android/app/build`, etc. — ce qui peut faire échouer un
renommage de dossier ou, plus rarement, un build concurrent.

Pour libérer les locks proprement (pas besoin de fermer Android Studio) :

```sh
cd android
./gradlew --stop   # arrête le Gradle Daemon proprement
```

Si le problème persiste avec les outils Dart/Kotlin d'Android Studio, ferme simplement le projet
correspondant dans l'IDE (File → Close Project) plutôt que de tuer des process à l'aveugle.

---

## Linux / WSL (Ubuntu)

Mêmes étapes qu'au-dessus, avec l'installation du SDK Android en ligne de commande (pas besoin
d'Android Studio ni d'interface graphique — pratique sous WSL).

### Prérequis

```sh
# Node.js 20+ (via nvm, recommandé)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20

# JDK 17
sudo apt update
sudo apt install -y openjdk-17-jdk unzip

# Android SDK command-line tools (sans Android Studio)
mkdir -p ~/Android/sdk/cmdline-tools
cd ~/Android/sdk/cmdline-tools
curl -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip cmdline-tools.zip && rm cmdline-tools.zip
mv cmdline-tools latest   # la structure attendue est cmdline-tools/latest/bin/...
```

Ajouter dans `~/.bashrc` (ou `~/.zshrc`) :

```sh
export ANDROID_HOME="$HOME/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
```

Puis (nouveau terminal, ou `source ~/.bashrc`) :

```sh
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"
```

(Ces numéros de version sont ceux confirmés fonctionner pour ce projet — voir la sortie
`[ExpoRootProject] Using the following versions` au début d'un build Gradle si tu veux vérifier ce
qu'attend une version future du projet.)

### Build

```sh
cd mobile
npm install
npx expo prebuild -p android
cd android
chmod +x gradlew   # le bit exécutable ne survit pas toujours à un checkout/clone
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

### Particularité WSL : pas d'émulateur Android dans WSL2

WSL2 est une VM Linux sans accélération graphique/KVM exposée par défaut — un émulateur Android
(qui a lui-même besoin de virtualisation matérielle) n'y tourne pas correctement dans le cas général.
En pratique, deux options réalistes pour tester l'APK construit dans WSL :

**Option A — téléphone physique en USB, passé à WSL via `usbipd-win`** (recommandé si tu as un
téléphone) :

1. Côté Windows (PowerShell **admin**), une fois : `winget install usbipd` (ou depuis
   [github.com/dorssel/usbipd-win](https://github.com/dorssel/usbipd-win)).
2. Branche le téléphone (débogage USB activé, autorise l'ordinateur sur le téléphone), puis :
   ```powershell
   usbipd list                     # repère le BUSID du téléphone
   usbipd bind --busid <BUSID>     # une fois, nécessite admin
   usbipd attach --wsl --busid <BUSID>
   ```
3. Côté WSL : `adb devices` doit maintenant lister le téléphone.

**Option B — émulateur (ou téléphone) sur le réseau, sans USB** :

Active le débogage sans fil sur le téléphone (Options développeur → Débogage sans fil), ou démarre
un émulateur Android **côté Windows** (Android Studio installé sur Windows, pas dans WSL) — WSL2
partage le réseau de l'hôte, donc :

```sh
adb connect <ip-du-telephone-ou-de-l-hote>:5555
adb devices
```

Voir [Utiliser adb](#utiliser-adb) ci-dessous pour la suite (installer l'APK, logs).

---

## Utiliser les scripts

`scripts/build-android.sh` (Linux/macOS/WSL/Git Bash) et `scripts/build-android.ps1` (PowerShell)
font exactement ce qui est décrit ci-dessus, avec des options pratiques :

```sh
# Linux / WSL / Git Bash
./scripts/build-android.sh --release --install                     # build + adb install
./scripts/build-android.sh --debug --api-base-url http://10.0.2.2:5173 --install
./scripts/build-android.sh --release --all-archs                   # les 4 ABI

# PowerShell
./scripts/build-android.ps1 -Mode release -Install
./scripts/build-android.ps1 -Mode debug -ApiBaseUrl http://10.0.2.2:5173 -Install
```

`-h`/`--help` (bash) ou `Get-Help ./scripts/build-android.ps1 -Detailed` (PowerShell) listent toutes
les options.

### Avec `make` (Linux/WSL/macOS/Git Bash uniquement)

Un `Makefile` à la racine de `mobile/` enveloppe le script bash pour des raccourcis courts :

```sh
make debug              # équivaut à ./scripts/build-android.sh --debug --arch arm64-v8a
make release
make install                        # build release + adb install
make install MODE=debug             # build debug + adb install
make release API_BASE_URL=http://10.0.2.2:5173
make all-archs
make clean                          # ./gradlew clean
make logcat                         # adb logcat filtré sur l'app
make devices                        # adb devices
```

`make` est nativement disponible sous Linux/WSL/macOS. **Sous Windows sans WSL ni Git Bash équipé de
make**, `make` n'est généralement pas installé (vérifié : absent par défaut sur cette machine) —
utilise directement `scripts/build-android.ps1` dans ce cas, ou installe `make` via
`choco install make` si tu veux quand même la commande unifiée.

---

## Utiliser adb

`adb` (Android Debug Bridge) est l'outil en ligne de commande qui parle à un émulateur ou un
téléphone Android. Il est installé avec le SDK, dans `platform-tools/`
(`%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` sous Windows,
`~/Android/sdk/platform-tools/adb` sous Linux).

| Commande | Effet |
|---|---|
| `adb devices` | Liste les devices/émulateurs connectés et vus par adb. Rien listé = adb ne voit rien, à corriger avant tout le reste. |
| `adb install -r chemin/vers/app.apk` | Installe l'APK (`-r` = remplace une install existante, garde les données de l'app). |
| `adb uninstall com.crystalmiaou.app` | Désinstalle l'app (nom de package défini dans `app.config.ts`). |
| `adb logcat` | Flux de logs système + app en continu. Filtrer le bruit : `adb logcat *:S ReactNative:V ReactNativeJS:V` (ne garde que les logs React Native). |
| `adb reverse tcp:5173 tcp:5173` | **Astuce utile pour un téléphone en USB** : redirige `localhost:5173` du téléphone vers `localhost:5173` de la machine de dev — évite de chercher l'IP LAN ou d'utiliser `10.0.2.2` (qui ne marche que pour l'émulateur). Combine avec `API_BASE_URL=http://localhost:5173` au build. |
| `adb connect <ip>:5555` | Connecte un device via le réseau plutôt que l'USB (device en mode debug sans fil, ou émulateur distant). `adb disconnect` pour couper. |
| `adb shell` | Ouvre un shell sur le device — utile pour aller fouiller `/sdcard/` etc., rarement nécessaire ici. |

Si `adb devices` liste un device en `unauthorized` : regarde l'écran du téléphone, une popup demande
d'autoriser l'ordinateur (à cocher "toujours autoriser" pour ne pas la revoir à chaque branchement).

---

## Utiliser un émulateur Android Studio (AVD) et voir les logs

### 1. Créer et lancer un émulateur (AVD)

1. Android Studio → **More Actions → Virtual Device Manager** (ou l'icône téléphone dans la barre
   d'outils si un projet est déjà ouvert).
2. **Create Device** → choisis un modèle (ex. Pixel 8) → une image système **avec Google Play**,
   de préférence en **x86_64** (bien plus rapide qu'ARM émulé sur un PC x86 — l'ABI de l'image
   système émulée n'a aucun rapport avec `-PreactNativeArchitectures`, qui ne concerne que l'APK que
   tu installes *dessus*).
3. Lance-le (bouton ▶ dans le Device Manager), ou en ligne de commande une fois créé :
   ```sh
   # lister les AVD créés
   %LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe -list-avds        # Windows
   ~/Android/sdk/emulator/emulator -list-avds                         # Linux/WSL
   # en lancer un
   emulator -avd Pixel_8_API_36
   ```
4. Une fois démarré, `adb devices` doit le lister (ex. `emulator-5554	device`) — c'est le signal
   qu'il est prêt.

### 2. Builder et installer dessus

Rien de spécial par rapport au reste de ce doc — un émulateur lancé est juste un device de plus pour
adb :

```sh
./scripts/build-android.sh --debug --api-base-url http://10.0.2.2:5173 --install
```

(`10.0.2.2` reste l'alias standard pour joindre le `localhost` de la machine hôte depuis
**n'importe quel** émulateur Android — pas depuis un téléphone physique, qui a besoin de l'IP LAN.)

### 3. Voir les logs

Deux façons, au choix :

- **Dans Android Studio** : `View → Tool Windows → Logcat` (ou l'onglet en bas de l'IDE). Sélectionne
  l'émulateur en haut du panneau, puis filtre par nom de package (`com.crystalmiaou.app`) pour ne
  garder que les logs de l'app — utile pour voir les crashs natifs (Kotlin/Java) en plus des logs JS.
- **En ligne de commande** (marche pareil avec ou sans Android Studio ouvert) :
  ```sh
  adb logcat *:S ReactNative:V ReactNativeJS:V
  ```
  Ce filtre ne garde que les tags `ReactNative`/`ReactNativeJS` — c'est là qu'atterrissent les
  `console.log`/`console.error` du code JS/TS de l'app (le `*:S` coupe tout le bruit système Android
  en amont). Retire le filtre (`adb logcat` tout court) pour tout voir, y compris les crashs natifs
  hors JS.

Le menu dev habituel de React Native (`Ctrl+M` sur l'émulateur, ou secouer un device physique)
fonctionne aussi sur une build **debug** — utile pour Fast Refresh en gardant `expo start` lancé à
côté (`API_BASE_URL` s'applique quand même, il vient du bundle déjà construit, pas de Metro).
Une build **release** n'a pas ce menu (JS figé dans l'APK, pas de connexion à Metro).
