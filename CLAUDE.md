# CLAUDE.md — NutriChat

Application de gestion de la nutrition pour chats : suivi des apports alimentaires, calcul automatique
des besoins nutritionnels recommandés, et alerte si les apports réels s'écartent des recommandations.

Une app mobile consommera plus tard **les mêmes routes API** que le frontend web. Toute décision
d'architecture découle de cette contrainte.

## Stack

- **SvelteKit** (TypeScript strict) — framework web
- **Better Auth** — authentification (`src/lib/server/auth.ts`, client `src/lib/auth-client.ts`)
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

```
src/
  routes/
    api/                → endpoints REST (+server.ts), SEUL point d'entrée de la logique métier
      auth/[...all]/      → handler Better Auth (catch-all)
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

## Règles absolues

1. **Sécurité SvelteKit** : ne jamais importer `src/lib/server/**` dans un fichier `.svelte` ou tout
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

## Conventions de nommage

- Fichiers de calcul pur : `*.calc.ts` dans `lib/domain/` (ex. `energy.calc.ts`, `comparison.calc.ts`).
- Repositories : `lib/server/repositories/<entité>.repository.ts`, une fonction exportée par requête
  (ex. `findCatById`, `listMealEntriesForCat`).
- Services : `lib/server/services/<entité>.service.ts`, orchestrent 1+ repositories et le domain.
- Routes API : REST classique sous `src/routes/api/<ressource>/+server.ts` et
  `src/routes/api/<ressource>/[id]/+server.ts` (GET/POST/PATCH/DELETE selon la méthode HTTP).
- Tables Drizzle : nom singulier snake_case côté SQL (`pgTable('cat', ...)`), export TS en
  camelCase singulier (`export const cat = ...`).
- Tests unitaires du domain : `*.calc.spec.ts` colocalisés avec le fichier testé.

## Domaine métier

- **Profil chat** (`cat`) : nom, poids, âge, sexe, stérilisé ou non, niveau d'activité, conditions de
  santé pertinentes pour le calcul (gestation, croissance, surpoids...).
- **Catalogue produits** (`product`) : nom, marque, type (croquettes/pâtée/friandise), valeurs
  nutritionnelles pour 100g (calories, protéines, lipides, glucides, fibres, cendres, humidité...).
- **Journal des repas** (`meal_entry`) : quantité d'un produit donnée à une date/heure.
- **Moteur de calcul** (`lib/domain/*.calc.ts`) :
  - RER (Resting Energy Requirement) et DER (Daily Energy Requirement) selon poids, stérilisation,
    niveau d'activité.
  - Apports réels sur une journée à partir du journal des repas.
  - Comparaison apports réels vs recommandés (calories + macronutriments), avec statut
    déficit / conforme / excès.
  - Fonctions pures, testables unitairement, sans dépendance DB.

## Scan d'étiquette (OCR local)

- OCR embarqué (Tesseract.js), aucun appel réseau vers un service tiers.
- Extraction de texte brut depuis l'image, puis parseur dédié dans `lib/domain/` qui repère les
  patterns usuels des tableaux nutritionnels (mots-clés « protéines », « lipides », « glucides »,
  « kcal/100g »...).
- L'UI de correction manuelle post-scan est obligatoire : le résultat de l'OCR est une pré-saisie,
  jamais une valeur validée automatiquement.

## Commandes

Voir [`README.md`](./README.md) pour la liste des scripts npm (dev, build, db:push, test...).

## Design system

Le projet dispose d'une maquette de référence créée avec Claude Design (via le MCP claude_design) :

- Import : Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login)
  to import this project: https://claude.ai/design/p/b011f7f1-8661-48a5-8405-15a789d5d93d?file=Ronron.dc.html
- Fichier principal : `Ronron.dc.html`
- Fichiers importés à lire aussi :
    - `_ds/nocturne-44ed1c71-941e-4453-a520-53a33369890a/_ds_bundle.js`
    - `_ds/nocturne-44ed1c71-941e-4453-a520-53a33369890a/styles.css`
    - `support.js`

**Comment l'utiliser :** avant de créer ou modifier une UI, consulte cette maquette via le MCP claude_design
pour en extraire le style (couleurs, typographie, espacements, style des composants — boutons, cards, inputs,
navigation). Reproduis ce langage visuel dans toutes les pages de l'application, y compris celles qui n'existent
pas encore dans la maquette.

**Important — c'est une maquette exploratoire, pas une spec figée :**
- Ne recopie jamais le texte, les libellés ou les micro-copies mot pour mot : la maquette peut contenir des
  placeholders, un ton ou un vocabulaire provisoires. Adapte les textes au contexte réel de l'app (nutrition féline).
- Les formulaires de la maquette peuvent être incomplets (champs manquants, validations absentes) : base-toi sur
  les specs fonctionnelles données dans les prompts de développement pour la liste réelle des champs, pas sur ce
  qui est visible dans le mock.
- En cas de conflit entre le mock et une exigence fonctionnelle explicite (un prompt de dev, une règle métier),
  la règle fonctionnelle l'emporte toujours ; seul le style visuel du mock fait foi.