# CLAUDE.md — Crystal Miaou

Application de gestion de la nutrition pour chats : suivi des apports alimentaires, calcul automatique
des besoins nutritionnels recommandés, et alerte si les apports réels s'écartent des recommandations.

Une app mobile Android native consomme **les mêmes routes API** que le frontend web. Toute décision
d'architecture découle de cette contrainte.

## Monorepo

- [`app/`](./app) — web + API SvelteKit. Toutes les règles de ce fichier concernant `src/`,
  `routes/`, `lib/` sont relatives à `app/` (ex. `src/lib/domain` = `app/src/lib/domain`).
- [`mobile/`](./mobile) — app Android **React Native native** (Expo en mode bare/prebuild, pas de
  webview), client pur de l'API de `app/` — aucune logique métier, aucun accès DB, uniquement des
  appels HTTP vers `/api/...` avec un token bearer (voir `app/src/lib/server/auth.ts`, plugin
  `bearer`). Build APK 100% local (`expo prebuild -p android` puis `expo run:android` / Gradle
  direct, **jamais EAS Build**). Organisé en atomic design (`src/design-system/{atoms,molecules,
  organisms}/`), même convention et mêmes noms de composants que côté web
  (`app/src/lib/components/`) quand un équivalent existe. Design mobile-first inspiré du web (mêmes
  couleurs/polices, cf. `app/src/routes/layout.css`), mais layouts et composants propres, pas de
  copie des composants `.svelte` du web. Types partagés en best-effort avec le web via
  `packages/shared-types/` (types uniquement, importés en `import type` pour ne jamais impacter le
  bundle Metro).
- [`flutter_mobile/`](./flutter_mobile) — ancienne app Android Flutter, remplacée par `mobile/`.
  Conservée pour référence (widget d'écran d'accueil, notifications locales) mais **non maintenue
  activement** ; ne pas y ajouter de nouvelles fonctionnalités.
- `packages/shared-types/` — types TypeScript partagés entre `app/` et `mobile/` (interfaces
  uniquement, aucune fonction), miroir maintenu à la main des DTO exposés par
  `app/src/lib/domain/*.calc.ts`.
- `specs/` — spécifications transverses aux deux apps.

## Stack

- **SvelteKit** (TypeScript strict) — web (`app/`, adapter-node)
- **React Native** (Expo, bare/prebuild) — app Android native (`mobile/`), build APK 100% local
  (`expo run:android` / Gradle), aucune dépendance cloud (pas d'EAS Build)
- **Better Auth** — authentification (`src/lib/server/auth.ts`, client web `src/lib/auth-client.ts`) ;
  cookies de session pour le web, plugin `bearer` (token `Authorization`) pour le mobile
- **Tailwind CSS** — style
- **PostgreSQL + Drizzle ORM** — persistance, syntaxe Relational Queries
- **adapter-node** — cible de déploiement
- **Vitest** — tests unitaires (domain layer en priorité)
- **Tesseract.js** (à venir) — OCR local pour le scan d'étiquettes, zéro dépendance à une API externe

## Règle d'architecture centrale : API-first, une seule source de vérité

**Toute la logique métier vit côté serveur, exposée via `src/routes/api/**/+server.ts`.**

- Les pages Svelte (`+page.svelte`, `+page.server.ts`) ne font **jamais** de calcul ni d'accès direct
  aux repositories/services : elles appellent l'API interne via `fetch('/api/...')`, exactement comme
  le fera la future app mobile.
- Aucune règle métier ne doit exister uniquement dans un composant `.svelte` ou un `+page.server.ts` —
  ce serait de la logique dupliquée le jour où l'app mobile arrive.
- Un `+page.server.ts` peut faire du `fetch` vers `/api/...` pour du SSR, mais ne doit contenir aucun
  calcul, aucune requête Drizzle, aucune règle métier.

## Arborescence

Tout ce qui suit est relatif à `app/` (donc `app/src/routes/api/...`, etc.).

```
src/
  routes/
    api/                → endpoints REST (+server.ts), SEUL point d'entrée de la logique métier
      v1/                 → toutes les routes métier versionnées (cats, foods, daily-plans,
                             meal-entries, repartition, daily-log, analyse...)
      auth/[...all]/      → handler Better Auth (catch-all), volontairement NON versionné
    (app)/               → pages Svelte, consomment uniquement l'API interne (fetch)
  lib/
    domain/               → types partagés + logique de calcul pure (*.calc.ts), zéro dépendance externe
    server/
      auth.ts               → config Better Auth (serveur)
      repositories/         → requêtes Drizzle pures (syntaxe Relational Queries)
      services/             → logique métier : orchestre repositories + domain
      db/
        schema.ts             → schéma Drizzle (source unique, y compris tables Better Auth)
        index.ts               → instance `db` (postgres-js)
    auth-client.ts          → client Better Auth (utilisable côté navigateur)
    components/             → UI Svelte réutilisable
  hooks.server.ts          → peuple `event.locals.session` / `event.locals.user` via Better Auth
```

### Flux de dépendance (sens unique, ne jamais inverser)

```
routes/api/**/+server.ts
        │  appelle
        ▼
lib/server/services/*.ts
        │  orchestre
        ▼
lib/server/repositories/*.ts  ──┐
        │  utilise               │ utilise (fonctions pures)
        ▼                        ▼
   db (Drizzle)            lib/domain/*.calc.ts

routes/(app)/**/+page.svelte  ──fetch──▶  routes/api/**
```

## Versionnage de l'API

Le web et le mobile consomment **exactement les mêmes routes**, sans contrôle commun sur leur cycle
de déploiement (l'APK mobile n'est pas mis à jour au même rythme que le serveur adapter-node) : toute
route métier est donc préfixée `api/v1/` (`src/routes/api/v1/<ressource>/+server.ts`), jamais
`api/<ressource>/` directement.

- **`api/auth/[...all]`** (handler Better Auth) reste **volontairement non versionné** : c'est le
  point de montage attendu par Better Auth et son plugin `bearer` (cf. `lib/server/auth.ts`), pas une
  route métier de l'app — le versionner forcerait à reconfigurer `basePath` côté serveur et côté
  clients pour aucun bénéfice.
- **Quand bumper `v2`** : uniquement en cas de changement **cassant** du contrat d'une route
  existante (champ renommé/supprimé, changement de type, nouvelle validation qui rejette des requêtes
  qui passaient avant). Ajouter un champ, une route, ou un paramètre de requête optionnel n'exige pas
  de nouvelle version.
- **Coexistence** : tant que `mobile/` (APK déjà installés) peut encore dépendre de `v1`, les routes
  `v1` restent servies telles quelles même après l'introduction de `v2` — dupliquer le `+server.ts`
  vers `api/v2/<ressource>/` plutôt que modifier `v1` en place. Ne retirer `v1` que lorsqu'aucune
  version publiée du mobile n'en dépend plus.
- **Où c'est câblé côté clients** : le web appelle les chemins littéraux `fetch('/api/v1/...')`
  directement dans les `+page.server.ts`/`.svelte` (pas de wrapper commun, cf. règle 6 — édition
  ciblée) ; le mobile fait pareil dans `mobile/src/api/*.ts` via `apiGet/apiPost/apiPatch/apiDelete`
  (`mobile/src/api/client.ts`). Ajouter une route = créer `src/routes/api/v1/<ressource>/+server.ts`
  et appeler `/api/v1/<ressource>` des deux côtés, pas de préfixe à déclarer ailleurs.

## Règles absolues

1. **Sécurité SvelteKit** : ne jamais importer `app/src/lib/server/**` dans un fichier `.svelte` ou tout
   code exécuté côté client (SvelteKit lèverait de toute façon une erreur de build, mais il ne faut
   même pas essayer).
2. **TypeScript strict** : `any` interdit. Tous les retours de fonctions publiques (services,
   endpoints, fonctions `domain`) sont typés explicitement, pas d'inférence implicite en sortie de
   fonction exportée.
3. **Drizzle** : utiliser la syntaxe Relational Queries (`db.query.table.findMany(...)`) par défaut.
   Le query builder classique (`db.select()...`) n'est autorisé qu'en cas de besoin de perf avéré,
   et doit alors être accompagné d'un commentaire expliquant pourquoi.
4. **Zéro validation autonome** : ne jamais exécuter de linter, formatter, `tsc`, `npm run check`,
   `npm run test`, ou tout autre script npm pour « vérifier » le travail. Éditer, puis s'arrêter —
   la vérification est faite manuellement par l'utilisateur dans son IDE.
5. **Laconique dans le terminal** : décrire les actions en 1-2 phrases max, pas de blabla.
6. **Édition ciblée** : ne jamais réécrire un fichier entier existant si une modification ciblée
   (Edit) suffit.
7. **`domain/*.calc.ts` reste pur** : aucune dépendance à Drizzle, à SvelteKit, ni à `fetch`. Ce sont
   des fonctions `(input) => output` testables unitairement sans DB ni serveur.
8. **Pas d'API tierce pour l'OCR** : la fonctionnalité de scan d'étiquette doit tourner entièrement
   en local (client ou serveur self-hosted), jamais via un appel à un service externe (OpenAI Vision,
   Google Vision, etc.). Le résultat d'un scan n'est jamais présenté comme définitif : une étape de
   correction manuelle par l'utilisateur est obligatoire avant sauvegarde.
9. **Zéro dérivation métier côté client, web ou mobile** : un composant `.svelte` ou un composant React
   Native (`.tsx`) n'a jamais le droit de recalculer, arrondir, ou agréger une valeur qui a un sens métier (quantités,
   doses, paquets, kcal, totaux par catégorie, pourcentages...) à partir de données brutes de l'API —
   même une simple somme ou division (ex. compter des doses de croquette, additionner des grammes par
   mode de distribution). Si l'écran a besoin d'un nombre dérivé, c'est l'endpoint qui le renvoie déjà
   calculé (ajouter un champ à la réponse plutôt que de le recalculer côté client), et toute règle
   d'arrondi/quantification (paquet, dose...) qui borne une quantité persistée doit être appliquée dans
   le service au moment de l'écriture (`PATCH`/`POST`), jamais seulement supposée respectée parce que
   l'UI a un slider avec le bon pas — sinon un client qui envoie une valeur "hors grille" (drag imprécis,
   requête API directe, futur troisième client) la persiste telle quelle. Objectif : le jour où deux
   clients (web + mobile) affichent la même donnée serveur, ils ne doivent jamais pouvoir afficher un
   résultat différent. Avant de considérer une feature terminée, relire chaque fichier `.svelte`/`.dart`
   touché à la recherche d'un calcul (`+ - * /`, `Math.`/`.round()`, `reduce`/agrégation) portant sur un
   champ métier (quantiteG, kcal, doseG, totaux...) en dehors d'un simple passthrough d'affichage — un
   tel calcul doit remonter dans le domain/service correspondant. Exemple canonique dans le code :
   `arrondirALaDose` (`repartition.calc.ts`) est appelée à la fois par le moteur de répartition du jour
   ET par `mealEntry.service.ts` au moment du `PATCH` manuel — jamais recalculée dans
   `DailyMealSchedule.svelte` ni dans l'écran équivalent de `mobile/src/screens/`, qui se contentent
   d'afficher `doses` / `recapCroquette` tels que renvoyés par `GET /api/v1/repartition`.

## Conventions de nommage

- Fichiers de calcul pur : `*.calc.ts` dans `lib/domain/` (ex. `energy.calc.ts`, `comparison.calc.ts`).
- Repositories : `lib/server/repositories/<entité>.repository.ts`, une fonction exportée par requête
  (ex. `findCatById`, `listMealEntriesForCat`).
- Services : `lib/server/services/<entité>.service.ts`, orchestrent 1+ repositories et le domain.
- Routes API : REST classique sous `src/routes/api/v1/<ressource>/+server.ts` et
  `src/routes/api/v1/<ressource>/[id]/+server.ts` (GET/POST/PATCH/DELETE selon la méthode HTTP) —
  voir section « Versionnage de l'API » ci-dessus.
- Tables Drizzle : nom singulier snake_case côté SQL (`pgTable('cat', ...)`), export TS en
  camelCase singulier (`export const cat = ...`).
- Tests unitaires du domain : `*.calc.test.ts` (ou `.spec.ts`, les deux sont acceptés par la config
  Vitest) colocalisés avec le fichier testé.

## Domaine métier

- **Profil chat** (`cat`) : nom, poids, âge, sexe, stérilisé ou non, niveau d'activité, conditions de
  santé pertinentes pour le calcul (gestation, croissance, surpoids...). `derAjustementPct` : correctif
  manuel du DER en % (valeurs fermées ±5/±10, `CAT_DER_AJUSTEMENT_PCT_VALEURS` dans `cat.calc.ts`),
  réservé au suivi de poids dans le temps (specs/nutrition-spec.md section 5) — toujours choisi
  explicitement par l'utilisateur depuis "Mes chats", jamais recalculé automatiquement par l'app.
- **Catalogue produits** (`food`) : nom, marque, type (croquette/pâtée/friandise), valeurs
  nutritionnelles pour 100g (calories, protéines, lipides, glucides, fibres, cendres, humidité...),
  poids du paquet (`packageSizeG`, pâtée uniquement).
- **Sélection active du chat** (`cat.activeCroquetteFoodId` / `activePateeFoodId` / `activeFriandiseFoodId`
  + `friandiseQuantiteTotaleG`) : les aliments donnés "en ce moment" à ce chat. **Persistant**, modifiable
  à tout moment depuis la home — jamais redemandé à chaque génération du menu du jour. Au moins pâtée ou
  croquette doit être actif (jamais aucun des deux) ; la friandise est optionnelle.
- **Routine** (`daily_plan` + `daily_plan_slot`) : le rythme des repas d'un chat — une heure + un type
  d'aliment (croquette/pâtée/friandise) par créneau, **sans quantité stockée** (calculée chaque jour).
  Une seule routine active à la fois par chat.
- **Journal des repas** (`meal_entry`) : une ligne par créneau et par jour, générée automatiquement à
  partir de la routine active dès que la page du jour est consultée sans entrées existantes (reset
  quotidien implicite). Porte la quantité du jour (`quantityG`), un verrou (`locked`, vrai dès qu'on
  ajuste le slider) et l'état "donné" (`validated` + `validatedByUserId` + `validatedAt`, pour
  l'attribution multi-utilisateur — qui a coché quoi, quand).
- **Moteur de calcul** (`lib/domain/*.calc.ts`) :
  - RER (Resting Energy Requirement) et DER (Daily Energy Requirement) selon poids, stérilisation,
    niveau d'activité (`nutrition.calc.ts`).
  - Répartition du menu du jour (`repartition.calc.ts`) : voir section dédiée ci-dessous.
  - Comparaison apports réels vs recommandés (calories + macronutriments), avec statut
    déficit / conforme / excès.
  - Fonctions pures, testables unitairement, sans dépendance DB.

## Répartition du menu du jour (`lib/domain/repartition.calc.ts`)

Principe : l'utilisateur ne raisonne jamais en grammes ou en calories, seulement en "quels aliments"
et "à quelle heure". Le moteur calcule tout le reste pour que la journée couvre exactement le DER —
ni trop, ni trop peu — sauf choix explicite de l'utilisateur (avec avertissement).

1. **Pâtée** : nombre de paquets **entiers**/jour (`calculerNombrePaquetsPatee`), jamais un demi ou un
   tiers de paquet, jamais 0 tant que la pâtée est active — c'est une contrainte dure, la pâtée ne se
   donne pas "en vrac". Arrondi "moitié vers le bas" (à égale distance entre N et N+1 paquets, on reste
   à N) : la pâtée coûte cher, en cas d'hésitation réelle on ouvre un paquet de moins et on laisse la
   croquette, moins chère, absorber la différence.
2. **Friandise** : quantité totale/jour choisie par l'utilisateur (pas calculée — c'est un extra, pas
   une variable nutritionnelle).
3. **Croquette** : absorbe le budget calorique restant (DER − pâtée − friandise). Si ce budget est
   négatif (pâtée/friandise dépassent déjà le DER), aucune croquette n'est ajoutée et un avertissement
   est renvoyé — jamais de quantité négative.
4. **Répartition entre créneaux d'un même type** : à parts égales entre les créneaux **non verrouillés**
   de ce type ; un créneau verrouillé (ajusté via slider, ou coché "donné") garde sa quantité, jamais
   recalculée. Le reste (total du type − somme des créneaux verrouillés) est réparti sur les créneaux
   restants, en préservant la somme exacte (pas de dérive d'arrondi). Si le reste devient négatif ou si
   tous les créneaux restants sont verrouillés sans couvrir le besoin, un avertissement est renvoyé au
   lieu d'une valeur silencieusement fausse. **Exception croquette** : la répartition n'est pas à parts
   égales mais au prorata d'un OBJECTIF KCAL par créneau (`calculerPoidsGapCroquette`,
   `repartition.calc.ts`) = durée pondérée jusqu'au repas suivant (tous types confondus, nuit 22h-7h
   comptée à 40% de sa durée réelle — dormir longtemps sans manger est normal pour le chat) × un taux
   kcal/minute constant sur la journée (`DER / durée totale pondérée du jour`, invariant = 1116 minutes
   pondérées quels que soient les horaires). Un créneau qui précède un long trou reçoit ainsi
   proportionnellement plus qu'un créneau suivi de près par le prochain repas. **Les kcal déjà apportées
   au même horaire par la pâtée ou la friandise sont déduites de cet objectif avant de peser la
   croquette** : une demi-pâtée donnée à 8h fait directement baisser la portion de croquette du créneau
   de 8h (pas seulement le total du jour) — un créneau dont la pâtée couvre déjà tout l'objectif reçoit un
   poids de 0, jamais négatif. Nécessite l'heure du créneau (`heureMinutes`) ; sans elle, repli silencieux
   sur un partage égal. **Plancher et plafond** (`repartition.calc.ts`) : `PORTION_CROQUETTE_MIN_G` (6g)
   — un créneau au gap très court ne descend jamais en dessous — et `RATIO_ECART_MAX_CROQUETTE` (×2.5) —
   le plus gros créneau du jour ne dépasse jamais 2.5 fois le plus petit, pour éviter l'effet "un gros
   repas suivi d'une miette" (retour terrain). Les deux sont appliqués par `respecterPlancherEtPlafond` en
   mélangeant progressivement la répartition pondérée avec un partage égal (jamais par écrêtage direct :
   un plafond calculé trop bas par rapport au budget total peut rendre la contrainte mathématiquement
   irréalisable sans perdre des kcal en route — le mélange, lui, préserve toujours la somme exacte). Si le
   budget du jour ne permet même pas 6g sur chacun des créneaux croquette de la routine, un avertissement
   le signale plutôt que d'écraser silencieusement le plancher.
5. **Persistance** : `calculerEtPersisterRepartitionJournaliere` (`repartition.service.ts`) recalcule et
   **enregistre immédiatement** en base les quantités des créneaux non verrouillés à chaque appel de
   `GET /api/v1/repartition` — c'est ce qui rend les ajustements visibles par tout le foyer sans dépendre
   d'un état local côté client.

## Scan d'étiquette (OCR local)

- OCR embarqué (Tesseract.js), aucun appel réseau vers un service tiers.
- Extraction de texte brut depuis l'image, puis parseur dédié dans `lib/domain/` qui repère les
  patterns usuels des tableaux nutritionnels (mots-clés « protéines », « lipides », « glucides »,
  « kcal/100g »...).
- L'UI de correction manuelle post-scan est obligatoire : le résultat de l'OCR est une pré-saisie,
  jamais une valeur validée automatiquement.

## Commandes

Voir [`README.md`](./README.md) pour la liste des scripts npm (dev, build, db:push, test...).


## Spécifications nutritionnelles

Toute la logique de calcul nutritionnel (RER, DER, répartition entre aliments,
validation des apports) est spécifiée dans `specs/nutrition-spec.md`.

Ce fichier fait foi : avant d'écrire ou modifier une fonction dans `domain/*.calc.ts`
liée à la nutrition, relis-le. Les formules, seuils, facteurs multiplicateurs et règles
de garde-fou qu'il contient priment sur toute approximation ou valeur par défaut que tu
pourrais choisir de ton propre chef.

En cas d'ambiguïté ou de choix d'implémentation non tranché par la spec (ex: Option 1
vs Option 2 de répartition), demande confirmation plutôt que de trancher seul.