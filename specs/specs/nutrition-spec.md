# Spécifications nutritionnelles pour app de gestion alimentaire féline

## 1. Étape 1 — Calculer le besoin énergétique du chat (DER)

Tout part d'un besoin calorique journalier cible, en **kcal/jour**. On calcule ça en deux temps.

### 1.1 RER — Resting Energy Requirement (métabolisme de base)

Deux formules possibles, la formule linéaire suffit pour la quasi-totalité des chats (2 à 15 kg) :

```
RER (kcal/j) = 30 × poids_kg + 70
```

Formule "exacte" (allométrique), utile si tu veux être plus précis, notamment pour chatons ou chats très légers/lourds :

```
RER (kcal/j) = 70 × poids_kg^0.75
```

→ Je te conseille d'implémenter les deux et de basculer automatiquement sur l'allométrique en dessous de 2kg ou au-dessus de 15kg.

⚠️ **Correction (2026-08-24)** : la borne haute de 45kg citée dans une version précédente de cette section
venait d'une formule générique "petits animaux" (chien + chat) non adaptée à l'espèce — un chat ne pèse
jamais 45kg, même en obésité extrême le record homologué tourne autour de 21kg. 15kg est une borne haute
réaliste (couvre les grandes races et les cas de surpoids marqué) pour une app **spécifique au chat**.
Vérifie que toute autre valeur numérique de ce document reste bien cat-spécifique et ne provient pas d'une
formule générique canine/féline non adaptée.

### 1.2 DER — Daily Energy Requirement (besoin réel journalier)

```
DER = RER × facteur_multiplicateur
```

Le facteur dépend du profil du chat. Voici les valeurs de référence (consensus WSAVA / AAHA) :

| Profil | Facteur |
|---|---|
| Chaton 0–4 mois | 2.5 – 3.0 |
| Chaton 4–12 mois | 2.0 |
| Adulte entier (non stérilisé) actif | 1.4 |
| Adulte stérilisé/castré, activité normale | 1.2 – 1.4 |
| Adulte stérilisé, chat d'intérieur peu actif | 1.0 – 1.2 |
| Perte de poids visée | 0.8 – 1.0 |
| Prise de poids visée | 1.2 – 1.8 |
| Senior actif (>7 ans) | 1.1 – 1.4 |
| Senior peu actif / sédentaire | 1.0 |
| Gestation | 1.6 – 2.0 |
| Lactation | 2.0 – 6.0 (selon nb de chatons) |

**Points d'attention pour ton implémentation :**
- La stérilisation réduit le besoin énergétique d'environ 20-30% (métabolisme + moins d'activité), donc c'est un booléen important dans ton formulaire.
- "Chat d'intérieur strict" doit tirer le facteur vers le bas (moins de dépense physique).
  **Décision d'implémentation (2026-08-24)** : c'est un champ booléen distinct du niveau d'activité
  (`hasOutdoorAccess` dans le schéma `cat`), demandé explicitement à l'utilisateur (onboarding + fiche
  chat) — deux chats "activité modérée" n'ont pas le même besoin selon qu'ils sortent ou non. Quand
  `hasOutdoorAccess === false`, `resoudreFacteurDER` (`nutrition.calc.ts`) réduit la position dans la
  plage applicable d'un quart (constante `CORRECTIF_INTERIEUR_STRICT = 0.25`), sans jamais descendre
  sous la borne basse de la plage. Accès extérieur inconnu (`null`, chats créés avant ce champ) = pas de
  correctif, traité comme neutre.
- Le poids à utiliser est le **poids idéal**, pas le poids actuel si le chat est en surpoids/sous-poids — sinon tu perpétues le problème. Prévois un champ "poids actuel" ET "poids cible/idéal".
- Défaut recommandé si l'utilisateur ne sait pas : adulte stérilisé, intérieur, activité normale → facteur **1.2**.

---

## 2. Étape 2 — Données nutritionnelles des aliments

Pour chaque produit (croquettes et pâtée), tu as besoin au minimum de :

- **Énergie métabolisable (EM) en kcal/100g** — c'est LA donnée clé. Elle est presque toujours indiquée sur l'emballage. Si elle ne l'est pas, elle peut être estimée via la formule d'Atwater modifiée (NRC) à partir des macronutriments :

```
EM (kcal/100g) = (protéines_g × 3.5) + (lipides_g × 8.5) + (glucides_g × 3.5)
```
*(glucides estimés par différence : 100 − protéines − lipides − cendres − humidité − fibres)*

⚠️ **Correction (2026-08-24) — deux erreurs dans le paragraphe ci-dessus.**

**1. « presque toujours indiquée sur l'emballage » est faux.** En UE, l'EM n'est PAS une mention
légalement obligatoire : la plupart des paquets grand public ne l'indiquent pas. Ce qui est obligatoire
et donc toujours disponible, c'est l'analyse nutritionnelle (protéines, lipides, fibres brutes, cendres
brutes). L'estimation n'est donc pas un cas marginal de repli — c'est **le chemin nominal** pour la
majorité des aliments, et l'UI doit le présenter comme tel (et non comme un pis-aller inquiétant, ce qui
faisait douter les utilisateurs de la fiabilité de toute l'app).

**2. L'Atwater modifiée est le mauvais estimateur pour un aliment pour chat.** Elle vient de la
nutrition humaine et ignore la digestibilité réelle de l'aliment ; la littérature comparative montre
qu'elle **sous-estime systématiquement** l'EM des aliments secs pour chat, ce qui gonfle mécaniquement
les grammages calculés par l'app (cas observé : 70 g/j affichés contre 55-60 g sur le paquet).

**Implémentation retenue : équation NRC 2006 (méthode FEDIAF en 4 étapes)**, `estimerEMNRC2006`
(`nutrition.calc.ts`). Coefficients **spécifiques au chat** — ne pas réutiliser pour une autre espèce
(le chien utilise 91.2 / 1.43 / 1.04) :

```
1. GE  (kcal/100g) = 5.7 × protéines_g + 9.4 × lipides_g + 4.1 × (glucides_g + fibres_g)
2. dE  (%)         = 87.9 − 0.88 × (fibres en % de la MATIÈRE SÈCHE)   [borné à 0-100]
3. DE  (kcal/100g) = GE × dE / 100
4. EM  (kcal/100g) = DE − 0.77 × protéines_g                            [borné à ≥ 0]
```

Piège à ne pas réintroduire : à l'étape 2 les fibres sont en % de **matière sèche**
(`fibres_g / (100 − humidité) × 100`), pas en % du produit brut — c'est l'échelle de l'équation NRC.

`estimerEMAtwater` reste exportée (comparaison, tests, détection des valeurs héritées) mais
**n'alimente plus aucune ration**. Les lignes déjà en base gardaient l'ancienne estimation : script de
rattrapage `npm run db:recompute-em` (dry-run par défaut, `--apply` pour écrire), qui ne touche jamais
une EM déclarée par l'utilisateur (`em_estimee = false`).

**Garde-fou associé** : `detecterEmSuspecte` (`food.calc.ts`) repère une EM enregistrée comme
« déclarée par le fabricant » qui est en réalité la suggestion de l'app recopiée telle quelle (les deux
formules sont testées, tolérance 0.5 kcal). Sans lui, une valeur estimée se faisait passer pour une
valeur mesurée et perdait tout signalement d'incertitude en aval. Affichée « EM à vérifier ».

**Écart résiduel avec le tableau de rationnement du paquet : normal, ne pas chercher à l'annuler.**
Ce tableau est générique (poids seul) ; l'app tient compte de la stérilisation et de l'activité, qui
pèsent 20-30% sur le besoin. Un écart de 10-15% est attendu et doit être **expliqué** dans l'UI, pas
masqué en truquant les facteurs pour retomber sur les chiffres du fabricant.

- Protéines (g/100g)
- Lipides (g/100g)
- Humidité (g/100g) — important car ça change beaucoup entre croquettes (~8-10%) et pâtée (~75-82%)
- Idéalement : fibres, cendres (pour affiner le calcul d'Atwater si l'EM n'est pas fournie)

**Correction (2026-08-24)** : cette liste est trompeuse sur ce qui est réellement toujours disponible.
En UE, sur une étiquette d'aliment complet, sont **légalement obligatoires** : protéines, lipides,
fibres brutes, cendres brutes (matières inorganiques) — présents sur toutes les étiquettes observées en
pratique. **L'humidité n'est obligatoire que si elle dépasse 14%**, donc quasiment jamais indiquée pour
une croquette sèche (~6-10% typiquement) — en faire un champ obligatoire dans le formulaire forçait les
utilisateurs à inventer une valeur. Implémentation retenue : `humiditeG100g` optionnel dans
`FoodInput`/schéma `food` (nullable), `fibresG100g`/`cendresG100g` obligatoires. Quand l'humidité est
absente, `resolveFoodHumidity` (`food.calc.ts`) applique un défaut générique par type d'aliment
(croquette 8%, pâtée 78%, friandise 10%) et pose `humiditeEstimee=true`, affiché comme badge "à
vérifier" — jamais silencieusement présenté comme une valeur mesurée.

---

## 3. Étape 3 — Le cœur du problème : répartir entre croquettes et pâtée

C'est ici que ça devient intéressant mathématiquement. Tu as une seule équation avec deux inconnues, donc **le système est sous-déterminé** — il te faut une contrainte supplémentaire selon le cas d'usage.

Notation :
- `Ck` = kcal/100g des croquettes, `Cw` = kcal/100g de la pâtée
- `x` = grammes de croquettes, `y` = grammes de pâtée
- `DER` = besoin calorique cible

Équation de base :
```
(Ck/100) × x + (Cw/100) × y = DER
```

### Cas A — L'utilisateur fixe une des deux quantités (ton besoin explicite)

C'est le cas le plus simple, pure algèbre :

**Si pâtée fixée à `y` grammes :**
```
x = (DER − (Cw/100) × y) / (Ck/100)
```

**Si croquettes fixées à `x` grammes :**
```
y = (DER − (Ck/100) × x) / (Cw/100)
```

⚠️ Cas limite à gérer dans ton code : si la quantité fixée dépasse déjà le DER (ex: l'utilisateur impose 200g de pâtée très calorique), le résultat pour l'autre aliment sera négatif. Il faut :
- Détecter `résultat < 0`
- Renvoyer une erreur explicite du type *"Avec 80g de pâtée, le quota calorique est déjà dépassé de X kcal — réduis la quantité de pâtée ou n'ajoute pas de croquettes"*

### Cas B — Rien n'est fixé, il faut une répartition "libre"

Là il te faut un paramètre de préférence, sinon le problème n'a pas de solution unique. Deux options, tu peux proposer les deux à l'utilisateur :

**Option 1 — Ratio calorique choisi par l'utilisateur** (le plus simple à coder)
L'utilisateur choisit par exemple "60% des calories en croquettes / 40% en pâtée" :
```
x = (DER × ratio_croquettes) / (Ck/100)
y = (DER × (1 − ratio_croquettes)) / (Cw/100)
```

**Option 2 — Contrainte protéique en plus de la contrainte calorique** (plus rigoureux nutritionnellement)
Si tu veux un vrai système à 2 équations / 2 inconnues, tu ajoutes une cible de protéines quotidiennes (`P_target`, en grammes, souvent estimé à ~5-6g de protéines/kg de poids/jour pour un chat adulte) :
```
(Ck/100) × x + (Cw/100) × y = DER
(Pk/100) × x + (Pw/100) × y = P_target
```
Ça se résout en système linéaire classique (méthode de Cramer ou matrice 2x2 — trivial à coder). Ça donne une répartition qui a un sens nutritionnel réel plutôt qu'arbitraire.

Je te recommande Option 1 pour la V1 (plus simple, donne déjà de la valeur), Option 2 en V2 si tu veux driver l'app par la qualité nutritionnelle plutôt que juste les calories.

---

## 4. Garde-fous nutritionnels à intégrer (recommandations FEDIAF/AAFCO)

Même si l'app calcule juste les calories, ajoute ces vérifications pour éviter des rations déséquilibrées :

- **Protéines minimum** : ~ 50g/1000kcal (soit environ 5.15g/kg de poids corporel/jour pour un adulte) — alerter si la ration calculée tombe en dessous.
- **Ne jamais descendre sous le RER** même en perte de poids (risque de lipidose hépatique, spécifique et dangereux chez le chat — contrairement au chien).
- **Transition alimentaire** : si tu changes de marque/recette, il faut un mélange progressif sur 7-10 jours (ex: J1-2 75%ancien/25%nouveau, J3-4 50/50, etc.) — bonne feature à ajouter si tu gères plusieurs produits en parallèle.
- **Eau** : la pâtée hydrate beaucoup plus (75-82% d'eau vs 8-10% pour les croquettes) — tu peux afficher un indicateur d'apport hydrique total, utile surtout pour les chats à risque urinaire.
- Arrondir les grammes à une précision réaliste pour une balance de cuisine (0.5g ou 1g), pas des décimales à 3 chiffres.

---

## 5. Résumé du flux logique pour ton app

1. Formulaire utilisateur → poids, âge, statut stérilisation, niveau d'activité/intérieur, objectif (maintien/perte/prise)
2. Calcul RER → application du facteur → `DER`
3. Saisie des données nutritionnelles des 2 (ou N) aliments testés (kcal/100g minimum)
4. Choix du mode de répartition :
    - Une quantité imposée → résoudre l'équation à 1 inconnue (Cas A)
    - Rien imposé → ratio choisi (Cas B, option 1) ou contrainte protéique (Cas B, option 2)
5. Validation : quantités positives, protéines suffisantes, ne pas repasser sous le RER
6. Affichage résultat + arrondi + apport hydrique estimé

Si tu veux gérer **plus de 2 aliments simultanément** (ex: croquettes + pâtée + friandises), le principe reste le même mais tu passes en résolution matricielle (N équations, N inconnues avec au moins N-1 contraintes fixées par l'utilisateur ou des ratios).

---

## 6. Étape 4 — Vérifier que la ration finale est complète et équilibrée

### 6.1 La limite à connaître avant de coder

Une étiquette de croquettes/pâtée ne donne quasiment **jamais** un panel nutritionnel complet. Ce qui est légalement obligatoire (en Europe : "analyse nutritionnelle", aux US : "guaranteed analysis") se limite en général à :

- Protéines brutes (minimum garanti)
- Matières grasses brutes (minimum garanti, parfois maximum)
- Cellulose brute / fibres brutes (maximum garanti)
- Cendres brutes (maximum garanti)
- Humidité (maximum garanti)
- Parfois : calcium, phosphore

Les autres nutriments essentiels du chat (taurine, arginine, acides gras essentiels, vitamines, oligo-éléments...) ne sont **quasiment jamais affichés** sur un paquet grand public, sauf mention volontaire du fabricant. Ta app ne pourra donc pas vérifier un "profil nutritionnel complet façon FEDIAF/AAFCO" à partir d'une étiquette — c'est un vrai laboratoire d'analyse qui fait ça. Ce que tu **peux** vérifier honnêtement et utilement :

1. Le ratio protéines/lipides/glucides de la ration totale
2. Que les minimums protéines/lipides sont bien couverts par rapport aux recommandations
3. Des ratios santé (ex: teneur en glucides, en cendres/minéraux)
4. Si les deux produits affichent la mention légale **"aliment complet"** (par opposition à "complémentaire") — c'est l'info la plus fiable et la plus simple à exploiter

C'est déjà énormément de valeur pour un utilisateur, sois transparent dans l'UI sur cette limite (ex: un badge "estimation basée sur les infos disponibles sur l'étiquette, ne remplace pas un avis vétérinaire").

### 6.2 Méthodologie : tout ramener en g / 1000 kcal

Pour comparer des croquettes (8-10% humidité) et de la pâtée (75-82% humidité) sur une base commune, il ne faut **jamais** comparer les % bruts de l'étiquette entre eux directement — il faut les ramener à la **densité nutritionnelle par calorie**, qui est la seule échelle valide pour un chat qui mange "à l'énergie" et pas "au poids".

```
nutriment (g/1000 kcal) = (nutriment_g_pour_100g / kcal_pour_100g) × 1000
```

Une fois que tu as calculé `x` grammes de croquettes et `y` grammes de pâtée (étape 3), calcule la contribution totale de chaque nutriment sur la ration complète :

```
total_nutriment_g = (nutriment_croquettes_g/100 × x) + (nutriment_pâtée_g/100 × y)
total_kcal = DER (par construction, puisque c'est ta contrainte de calcul)

nutriment_ration_g_par_1000kcal = (total_nutriment_g / total_kcal) × 1000
```

Tu compares ensuite cette valeur à une table de référence (ci-dessous).

### 6.3 Table de référence — valeurs usuelles pour chat adulte en entretien

⚠️ Ce sont des valeurs de référence couramment citées (issues des standards AAFCO/FEDIAF, harmonisées). Les guidelines FEDIAF ont été mises à jour en septembre 2024 avec des ajustements mineurs (notamment sur le phosphore inorganique) — si tu veux une précision "de niveau industriel", va chercher le tableau officiel FEDIAF 2024 en PDF plutôt que de figer ces chiffres en dur dans ton code.

| Nutriment | Minimum recommandé | Maximum recommandé | Remarque |
|---|---|---|---|
| Protéines | ~50-65 g / 1000 kcal | pas de max strict | Le chat est un carnivore strict, ses besoins protéiques sont bien plus élevés que le chien |
| Lipides | ~22-25 g / 1000 kcal | pas de max strict (mais attention à la densité calorique en cas de surpoids) | Sert aussi de vecteur aux vitamines liposolubles (A,D,E,K) |
| Acide linoléique | ~1.1 g / 1000 kcal | — | Acide gras essentiel |
| Taurine | ~1.0 g / 1000 kcal (croquettes), ~1.7 g / 1000 kcal (humide, moins bien assimilée) | — | **Critique chez le chat** — une carence cause des maladies cardiaques (cardiomyopathie dilatée) et de la cécité. Quasi jamais indiqué sur l'étiquette grand public malheureusement. |
| Arginine | ~2.6 g / 1000 kcal | — | Indispensable même en un seul repas (le chat ne peut pas synthétiser d'urée sans) |
| Calcium | ~1.4 g / 1000 kcal | ~6 g / 1000 kcal | Ratio Ca:P doit rester entre 1:1 et 2:1 |
| Phosphore | ~1.3 g / 1000 kcal | ~2.5 g / 1000 kcal | Attention en cas d'insuffisance rénale (hors sujet ici mais garde en tête si tu ajoutes un jour un mode "chat avec pathologie") |
| Glucides | pas de minimum (le chat n'a **aucun besoin physiologique** de glucides) | pas de maximum réglementaire, mais > 10-12% de la MS interroge sur la pertinence espèce | À traiter comme un indicateur qualité plus qu'une alerte stricte |

**Décision d'implémentation (2026-08-24)** : jusqu'ici l'app affichait "OK" pour les glucides quelle que
soit la valeur (aucun seuil exploité), ce qui ne répondait pas à "comment sait-on qu'il n'y en a pas
trop ?". Corrigé : `agregerRation` calcule maintenant la matière sèche totale de la ration (poids −
humidité, par aliment), et `validerRation` calcule le ratio glucides / matière sèche en %. Au-delà de
12%, le statut passe à un nouveau statut **`ATTENTION`** (distinct de `EXCES`, réservé aux seuils
médicaux durs comme Ca/P) — l'UI l'affiche "À surveiller", pas "Excès", pour ne pas donner un faux
sentiment d'urgence sur un indicateur que la spec elle-même qualifie de qualité et non d'alerte stricte.
Protéines/lipides/taurine restent volontairement sans maximum (carnivore strict) — l'UI l'explique
maintenant explicitement plutôt que de laisser un silence ambigu, et renvoie vers la barre kcal/DER
comme véritable garde-fou contre l'excès calorique global.

### 6.4 Logique de validation à coder

```
Pour chaque nutriment N dans [protéines, lipides, taurine, arginine, calcium, phosphore]:
    valeur_ration = calcul_g_par_1000kcal(N)
    
    si valeur_ration < minimum(N):
        status = "DÉFICIT" → alerte rouge
    sinon si maximum(N) existe et valeur_ration > maximum(N):
        status = "EXCÈS" → alerte orange
    sinon:
        status = "OK" → vert

Cas particulier ratio Ca:P :
    ratio = calcium_ration / phosphore_ration
    si ratio < 1.0 ou ratio > 2.0 : alerte

Cas particulier "aliment complet" :
    si les DEUX produits sont marqués "complet" sur l'étiquette :
        afficher "Les deux aliments sont normalement équilibrés individuellement, 
        le mélange dans les proportions calculées couvre en principe les besoins de base"
    sinon si un des deux est "complémentaire" (ex: pâtée gourmande, topping) :
        alerte : "Un des produits est complémentaire, pas complet — 
        la ration totale peut être déséquilibrée même si les calories sont respectées"
```