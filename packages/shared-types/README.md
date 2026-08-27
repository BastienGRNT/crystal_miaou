# @shared types

Types TypeScript partagés entre `app/` (SvelteKit) et `mobile/` (React Native) — **interfaces et
types uniquement, aucune fonction, aucune dépendance**.

Ce dossier est un **miroir maintenu à la main** des DTO exposés par l'API (`app/src/routes/api/**`),
eux-mêmes dérivés des interfaces de `app/src/lib/domain/*.calc.ts` et
`app/src/lib/server/services/*.service.ts`. Il n'y a pas de génération automatique : si un endpoint
change de forme côté `app/`, mets à jour le fichier correspondant ici.

Le web peut importer directement depuis `app/src/lib/domain/*.calc.ts` (même runtime) — il n'a pas
besoin de ces fichiers. Ils existent pour `mobile/`, qui ne peut pas importer du code SvelteKit
serveur : tous les imports côté RN utilisent `import type { ... } from '@shared/...'`, effacés par
Babel à la compilation (TypeScript type-only), donc jamais résolus par Metro.
