# Crystal Miaou — app mobile (React Native / Expo)

Client Android natif de l'API `app/` — aucune logique métier, aucun accès DB, uniquement des appels
HTTP vers `/api/...` avec un token bearer (voir `app/src/lib/server/auth.ts`, plugin `bearer`).

Expo est utilisé en mode **bare/prebuild** : le dossier `android/` est un vrai projet Gradle généré
une fois puis committé, buildable en local sans jamais appeler EAS Build.

## Build (Windows & Linux/WSL)

Voir **[docs/BUILD.md](./docs/BUILD.md)** pour la doc complète (prérequis par OS, particularités
WSL, dépannage) et **[docs/BUILD.md#utiliser-adb](./docs/BUILD.md#utiliser-adb)** pour adb.

Démarrage rapide via les scripts fournis (`scripts/build-android.sh` pour Linux/macOS/WSL/Git Bash,
`scripts/build-android.ps1` pour PowerShell — ou `make` sur Unix, voir `Makefile`) :

```sh
cd mobile
npm install
./scripts/build-android.sh --release --install     # build + adb install sur le device détecté
```

```powershell
cd mobile
npm install
./scripts/build-android.ps1 -Mode release -Install
```

Par défaut (voir `app.config.ts`), l'app cible le serveur de **production**
(`https://miaou.bastiengrnt.fr`) — y compris en debug. Pour développer contre `app/` en local :

```sh
./scripts/build-android.sh --debug --api-base-url http://10.0.2.2:5173 --install
```

⚠️ `API_BASE_URL` doit être fixé **au moment du build** (lu par `app.config.ts`, évalué par Gradle à
la compilation) — changer la variable d'env après coup n'affecte pas un APK déjà buildé, il faut
reconstruire.

## Architecture

Voir `CLAUDE.md` (racine du repo) pour les règles du monorepo. En bref :

- `src/design-system/{atoms,molecules,organisms}/` — composants UI, même convention et mêmes noms
  que côté web (`app/src/lib/components/`) quand un équivalent existe.
- `src/screens/` — écrans, composés uniquement de `design-system/*`.
- `src/api/` — client HTTP (`client.ts`) + hooks React Query par ressource.
- `src/auth/` — contexte d'authentification (token sécurisé, état connecté/déconnecté).
- `src/navigation/` — React Navigation (bottom tabs + stacks).
- `../packages/shared-types/` — types TypeScript partagés avec `app/` (interfaces uniquement).

**Zéro dérivation métier côté client** (CLAUDE.md règle 9) : un écran ne recalcule jamais une
quantité/kcal/dose à partir de données brutes — ces valeurs sont toujours déjà calculées par l'API.

## État du portage (depuis l'app Flutter, `flutter_mobile/`)

- ✅ Auth (connexion/inscription), onboarding (premier chat)
- ✅ Accueil / menu du jour : score, résumé, timeline des repas, ajustement slider, sélection
  d'aliments actifs, détail du calcul, historique des jours passés
- ✅ Mes chats : profils, ajustement DER rapide, modale d'édition, suivi de poids, foyer multi-user
- ✅ Aliments : CRUD, filtre par type, scan d'étiquette OCR (caméra/galerie → `/api/foods/scan`,
  correction manuelle obligatoire avant sauvegarde)
- ✅ Analyse : sélecteur chat/période, graphique barres, stats de conformité
- ✅ Routines : CRUD journées type + activation
- ✅ Ajouter un repas manuel, Comprendre le calcul (contenu statique)
- ⏳ Widget écran d'accueil Android, notifications locales — équivalents natifs de
  `flutter_mobile/lib/widget/` et `flutter_mobile/lib/notifications/`, pas encore portés
  (le plus délicat : modules natifs Kotlin custom, nécessite un config plugin Expo dédié)

Simplification volontaire par rapport au web : le formulaire Aliments n'affiche pas d'aperçu live de
l'énergie (Atwater/NRC2006) pendant la saisie — le web le calcule côté client en important directement
`resolveFoodEnergyValues` (même runtime JS), ce que le mobile ne peut pas faire sans dupliquer la
formule (CLAUDE.md règle 9). Les badges "EM estimée"/"Glucides estimés" restent visibles une fois
l'aliment enregistré, comme sur la liste. Un futur endpoint `/api/foods/preview` lèverait cette
limite pour les deux clients si besoin.
