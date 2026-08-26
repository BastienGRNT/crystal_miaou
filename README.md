# Crystal Miaou

Application de gestion de la nutrition pour chats : suivi des apports alimentaires, calcul automatique des besoins nutritionnels recommandés, et alerte en cas d'écart avec les recommandations.

Voir [`CLAUDE.md`](./CLAUDE.md) pour l'architecture détaillée, les conventions et les règles du projet.

Monorepo : [`app/`](./app) (web + API SvelteKit) et [`mobile/`](./mobile) (app Android Flutter,
client pur de l'API de `app/`).

## Prérequis

- Node.js 20+
- Docker (pour la base PostgreSQL locale)
- Flutter SDK + Android Studio/SDK (pour builder l'app mobile, voir [`mobile/README.md`](./mobile/README.md))

## Démarrage (web + API)

Toutes les commandes ci-dessous s'exécutent depuis `app/` :

```sh
cd app
```

1. Installer les dépendances :

   ```sh
   npm install
   ```

2. Copier le fichier d'environnement et ajuster si besoin :

   ```sh
   cp .env.example .env
   ```

3. Démarrer la base de données PostgreSQL locale :

   ```sh
   npm run db:start
   ```

4. Appliquer le schéma à la base :

   ```sh
   npm run db:push
   ```

5. Lancer le serveur de développement :

   ```sh
   npm run dev -- --open
   ```

## OCR (scan d'étiquette)

Le scan d'étiquette (page Aliments) tourne entièrement en local via Tesseract.js. Les données de
langue (français + anglais) ne sont pas committées dans le repo ; téléchargez-les une fois :

```sh
npm run setup:ocr
```

Ce script a besoin d'une connexion internet (téléchargement dans `app/static/tessdata/`), mais l'app
elle-même n'effectue ensuite aucun appel réseau pour l'OCR. À relancer après un clone ou dans le
pipeline de déploiement — pas nécessaire si `app/static/tessdata/` est déjà peuplé.

## Scripts utiles

| Script               | Description                                      |
| -------------------- | ------------------------------------------------- |
| `npm run dev`         | Lance le serveur de développement                 |
| `npm run build`       | Build de production (adapter-node)                |
| `npm run preview`     | Prévisualise le build de production               |
| `npm run check`       | Vérification TypeScript / Svelte                  |
| `npm run test`        | Lance les tests unitaires (Vitest)                 |
| `npm run db:start`    | Démarre PostgreSQL via Docker Compose              |
| `npm run db:push`     | Applique le schéma Drizzle à la base               |
| `npm run db:generate` | Génère une migration Drizzle à partir du schéma    |
| `npm run db:migrate`  | Applique les migrations générées                   |
| `npm run db:studio`   | Ouvre Drizzle Studio                               |
| `npm run setup:ocr`   | Télécharge les données de langue OCR (une fois)    |

## App mobile Android

Voir [`mobile/README.md`](./mobile/README.md) pour builder l'APK. En bref : app Flutter native
(pas de webview), build 100% local via `flutter build apk`, aucune étape cloud.

## Stack

SvelteKit (TypeScript strict) · Better Auth · Tailwind CSS · PostgreSQL · Drizzle ORM · Flutter (mobile)
