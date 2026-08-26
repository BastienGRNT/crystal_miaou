# Crystal Miaou — mobile

App Android **native** (Flutter, moteur Skia — pas de webview/Chromium) qui consomme l'API de
[`../app`](../app). Aucune logique métier ici : uniquement des `fetch` vers `/api/...` avec un token
bearer, cf. [`../CLAUDE.md`](../CLAUDE.md).

## Pourquoi Flutter (et pas Capacitor/React Native)

- Pas de webview : rendu natif Skia, alignable avec les widgets Android natifs.
- `home_widget` : le package le plus mature pour des widgets d'écran d'accueil personnalisés
  (`AppWidgetProvider` Kotlin) — voir `native/widget/`.
- `flutter_local_notifications` : rappels de repas 100% locaux, aucun broker/FCM.
- `flutter build apk` : build 100% local (Gradle interne), zéro étape cloud — contrairement à Expo.

## Prérequis (une seule fois)

1. Installer le [Flutter SDK](https://docs.flutter.dev/get-started/install) et Android Studio (SDK +
   un émulateur, ou un téléphone en mode développeur/USB debugging).
2. Vérifier l'installation :
   ```sh
   flutter doctor
   ```

## Premier lancement (génère le dossier `android/`)

Ce dépôt contient déjà `pubspec.yaml` et `lib/`, mais **pas** encore `android/` (généré par Flutter
lui-même, pas committé à la main pour rester toujours cohérent avec la version de Flutter installée
chez toi). À faire une seule fois :

```sh
cd mobile
flutter create --platforms=android --org com.crystalmiaou .
flutter pub get
```

Ensuite, active le widget d'écran d'accueil personnalisé en copiant les fichiers fournis dans
`native/widget/` :

```sh
cp native/widget/HomeWidgetProvider.kt android/app/src/main/kotlin/com/crystalmiaou/crystal_miaou/HomeWidgetProvider.kt
cp native/widget/home_widget_layout.xml android/app/src/main/res/layout/home_widget_layout.xml
mkdir -p android/app/src/main/res/xml
cp native/widget/home_widget_info.xml android/app/src/main/res/xml/home_widget_info.xml
```

Puis ouvre `android/app/src/main/AndroidManifest.xml` et colle le contenu de
`native/widget/AndroidManifest.snippet.xml` à l'intérieur de la balise `<application>`.

## Lancer en dev

Démarre d'abord l'API en local (`cd ../app && npm run dev`), puis :

```sh
flutter run
```

- Émulateur Android : l'URL par défaut (`http://10.0.2.2:5173`) fonctionne sans rien changer.
- Téléphone physique sur le même réseau :
  ```sh
  flutter run --dart-define=API_BASE_URL=http://<IP_LAN_DE_TON_PC>:5173
  ```

## Builder l'APK (100% local)

```sh
flutter build apk --release --dart-define=API_BASE_URL=https://<url-de-prod>
```

L'APK signé (debug key par défaut) se trouve dans
`build/app/outputs/flutter-apk/app-release.apk` — à transférer/installer directement sur le
téléphone, aucun store ni build cloud requis.

## Notes

- Les versions dans `pubspec.yaml` ont été fixées sans accès à pub.dev depuis cet environnement ; si
  `flutter pub get` échoue sur un conflit de résolution, lance `flutter pub upgrade --major-versions`.
- Les polices (Inter/Manrope, comme sur le web) sont chargées via `google_fonts`, mise en cache après
  le premier lancement — pour un fonctionnement 100% hors-ligne dès l'installation, télécharger les
  `.ttf` et les déclarer en asset local dans `pubspec.yaml` à la place.

## Structure

```
lib/
  core/
    api_client.dart     → wrapper HTTP + token bearer (flutter_secure_storage)
    theme.dart           → couleurs/polices calquées sur app/src/routes/layout.css
    models/              → miroirs Dart des shapes JSON de l'API
  features/
    auth/                 → login (Better Auth, plugin bearer)
    today/                → écran "Aujourd'hui" (timeline repas, checkbox "donné")
    cats/                 → liste des chats + ajustement DER en un clic
  widget/                 → pont Dart ↔ widget d'écran d'accueil (home_widget)
  notifications/          → rappels de repas locaux (flutter_local_notifications)
native/widget/            → fichiers Kotlin/XML à copier dans android/ après `flutter create`
```
