/**
 * Extraction best-effort de valeurs nutritionnelles depuis un texte OCR brut (étiquette de paquet).
 * Fonction pure : aucune dépendance à Tesseract, Drizzle ou SvelteKit — testable sans OCR réel en
 * simulant le texte qu'un scan aurait produit (bruit inclus).
 */

import type { FoodLegalStatus, FoodType } from './food.calc';

export interface ParsedField<T> {
	value: T | null;
	/** Extrait de texte source ayant permis l'extraction (aide à la relecture manuelle). */
	raw: string | null;
}

export interface ParsedFoodLabel {
	name: ParsedField<string>;
	brand: ParsedField<string>;
	type: ParsedField<FoodType>;
	statutLegal: ParsedField<FoodLegalStatus>;
	emKcal100g: ParsedField<number>;
	proteinesG100g: ParsedField<number>;
	lipidesG100g: ParsedField<number>;
	humiditeG100g: ParsedField<number>;
	fibresG100g: ParsedField<number>;
	cendresG100g: ParsedField<number>;
	glucidesG100g: ParsedField<number>;
	warnings: string[];
}

/** Normalise le texte OCR : accents optionnels côté regex, casse, espaces multiples. */
function normaliserLigne(ligne: string): string {
	return ligne.replace(/\s+/g, ' ').trim();
}

function retirerAccents(texte: string): string {
	return texte.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Corrige les confusions OCR fréquentes juste avant les nombres : Tesseract lit souvent un "1"
 * comme "l"/"I", ou un "0" comme "O", surtout dans des tableaux imprimés petits.
 */
function corrigerConfusionsChiffres(texte: string): string {
	return texte.replace(/[lI](?=[\d.,%])/g, '1').replace(/(?<=[\d.,])[lI]/g, '1').replace(/(?<=\d)O/gi, '0');
}

interface ChampNumerique {
	cle: keyof Pick<
		ParsedFoodLabel,
		'proteinesG100g' | 'lipidesG100g' | 'humiditeG100g' | 'fibresG100g' | 'cendresG100g' | 'glucidesG100g'
	>;
	// Regex sur texte sans accents, insensible à la casse. Le groupe 1 doit capturer le nombre.
	motsCles: RegExp[];
}

// Nombre : virgule ou point décimal, tolère "l" OCR confondu avec "1" en le corrigeant en amont.
const NOMBRE = '(\\d+(?:[.,]\\d+)?)';

const CHAMPS_NUMERIQUES: ChampNumerique[] = [
	{
		cle: 'proteinesG100g',
		motsCles: [new RegExp(`proteines?( brutes?)?[^\\d%]{0,15}${NOMBRE}`, 'i')]
	},
	{
		cle: 'lipidesG100g',
		motsCles: [
			new RegExp(`(matieres? grasses|lipides)( brutes?)?[^\\d%]{0,15}${NOMBRE}`, 'i')
		]
	},
	{
		cle: 'humiditeG100g',
		motsCles: [new RegExp(`humidite[^\\d%]{0,15}${NOMBRE}`, 'i')]
	},
	{
		cle: 'fibresG100g',
		motsCles: [
			new RegExp(`(fibres?( alimentaires?)?|cellulose( brute)?)[^\\d%]{0,15}${NOMBRE}`, 'i')
		]
	},
	{
		cle: 'cendresG100g',
		motsCles: [
			new RegExp(`(cendres?( brutes?)?|matiere(s)? minerale(s)?)[^\\d%]{0,15}${NOMBRE}`, 'i')
		]
	},
	{
		cle: 'glucidesG100g',
		motsCles: [
			new RegExp(`(glucides|hydrates de carbone|amidon)[^\\d%]{0,15}${NOMBRE}`, 'i')
		]
	}
];

const REGEX_ENERGIE = new RegExp(
	`(energie( metabolisable)?|em\\b)[^\\d]{0,20}${NOMBRE}\\s*(kcal)?\\s*/?\\s*(100\\s*g|kg|100g)?`,
	'i'
);

function parseNombre(brut: string): number {
	return Number(brut.replace(',', '.'));
}

function extraireChampNumerique(texteSansAccents: string, champ: ChampNumerique): ParsedField<number> {
	for (const regex of champ.motsCles) {
		const match = texteSansAccents.match(regex);
		if (match) {
			const nombre = match[match.length - 1];
			const valeur = parseNombre(nombre);
			if (Number.isFinite(valeur)) {
				return { value: valeur, raw: normaliserLigne(match[0]) };
			}
		}
	}
	return { value: null, raw: null };
}

// Plage plausible pour un aliment pour chat (croquette la plus dense ~550, pâtée la plus basse ~60).
const ENERGIE_MIN_PLAUSIBLE = 50;
const ENERGIE_MAX_PLAUSIBLE = 600;

function extraireEnergie(texteSansAccents: string): { field: ParsedField<number>; warning: string | null } {
	const match = texteSansAccents.match(REGEX_ENERGIE);
	if (!match) {
		return { field: { value: null, raw: null }, warning: null };
	}

	const valeurBrute = parseNombre(match[3]);
	if (!Number.isFinite(valeurBrute)) {
		return { field: { value: null, raw: null }, warning: null };
	}

	const unite = (match[5] ?? '').replace(/\s+/g, '');
	// "kcal/kg" (courant sur les croquettes) : convertir en kcal/100g.
	const estParKg = unite === 'kg';
	let valeur = estParKg ? valeurBrute / 10 : valeurBrute;
	let warning = estParKg ? 'Énergie convertie de kcal/kg vers kcal/100g.' : null;

	// Point décimal souvent illisible par l'OCR ("399.4" lu "3994") : si la valeur /10 retombe
	// dans une plage plausible pour du kcal/100g, on corrige plutôt que de garder une valeur absurde.
	if (valeur > ENERGIE_MAX_PLAUSIBLE && valeur / 10 >= ENERGIE_MIN_PLAUSIBLE && valeur / 10 <= ENERGIE_MAX_PLAUSIBLE) {
		valeur = valeur / 10;
		warning = "Énergie divisée par 10 (point décimal probablement manqué par l'OCR) — vérifiez la valeur.";
	}

	return {
		field: { value: valeur, raw: normaliserLigne(match[0]) },
		warning
	};
}

const MOTS_CLES_TYPE: { type: FoodType; regex: RegExp }[] = [
	{ type: 'patee', regex: /patee|terrine|\ben (sauce|gelee)\b|mousse|morceaux en/i },
	{ type: 'friandise', regex: /friandise|snack|recompense/i },
	{ type: 'croquette', regex: /croquettes?/i }
];

/** Type d'aliment déduit des mots du texte (première correspondance dans l'ordre de spécificité). */
function extraireType(texteSansAccents: string): ParsedField<FoodType> {
	for (const { type, regex } of MOTS_CLES_TYPE) {
		const match = texteSansAccents.match(regex);
		if (match) {
			return { value: type, raw: normaliserLigne(match[0]) };
		}
	}
	return { value: null, raw: null };
}

/** Mention légale "aliment complet" vs "aliment complémentaire", la plus fiable d'une étiquette. */
function extraireStatutLegal(texteSansAccents: string): ParsedField<FoodLegalStatus> {
	const matchComplementaire = texteSansAccents.match(/aliment(s)?\s+complementaire(s)?/i);
	if (matchComplementaire) {
		return { value: 'complementaire', raw: normaliserLigne(matchComplementaire[0]) };
	}
	const matchComplet = texteSansAccents.match(/aliment(s)?\s+complet(s)?/i);
	if (matchComplet) {
		return { value: 'complet', raw: normaliserLigne(matchComplet[0]) };
	}
	return { value: null, raw: null };
}

// En-têtes de section usuels sur une étiquette : jamais le nom du produit lui-même.
const ENTETES_SECTION =
	/^(composition|ingredients?|nutrition|additifs?( nutritionnels?| technologiques?)?(\s*\/\s*kg)?|constituants analytiques|analyse( nutritionnelle| moyenne)?|allergies|preferences|energie|valeurs? nutritionnelles?)\s*:?$/i;

/** Première ligne non vide, non purement numérique et hors en-têtes de section, considérée comme nom du produit (confiance faible). */
function extraireNom(lignes: string[]): ParsedField<string> {
	for (const ligne of lignes) {
		const nettoyee = normaliserLigne(ligne);
		const sansAccents = retirerAccents(nettoyee);
		if (
			nettoyee.length >= 3 &&
			nettoyee.length <= 80 &&
			!nettoyee.includes(',') &&
			!/^\d/.test(nettoyee) &&
			!/^[\d\s.,%/]+$/.test(nettoyee) &&
			!ENTETES_SECTION.test(sansAccents)
		) {
			return { value: nettoyee, raw: nettoyee };
		}
	}
	return { value: null, raw: null };
}

const MOTS_CLES_TABLEAU = /analyse( nutritionnelle| moyenne)?|composition analytique|constituants analytiques/i;

export function parseFoodLabelText(rawText: string): ParsedFoodLabel {
	const lignes = rawText.split('\n').map(normaliserLigne).filter(Boolean);
	const texteSansAccents = corrigerConfusionsChiffres(retirerAccents(rawText.toLowerCase()));

	const warnings: string[] = [];

	const tableauDetecte = MOTS_CLES_TABLEAU.test(texteSansAccents);
	if (!tableauDetecte) {
		warnings.push('Aucun tableau nutritionnel détecté — vérifiez toutes les valeurs.');
	}

	const champs = Object.fromEntries(
		CHAMPS_NUMERIQUES.map((champ) => [champ.cle, extraireChampNumerique(texteSansAccents, champ)])
	) as Record<ChampNumerique['cle'], ParsedField<number>>;

	const { field: emKcal100g, warning: warningEnergie } = extraireEnergie(texteSansAccents);
	if (warningEnergie) warnings.push(warningEnergie);

	// Constituants légalement obligatoires sur une étiquette UE d'aliment complet (protéines, lipides,
	// fibres brutes, cendres brutes) — l'humidité n'en fait PAS partie sous 14% (quasi jamais présente
	// pour une croquette sèche), donc son absence n'est pas signalée comme un manque.
	const LIBELLES_ESSENTIELS: Record<'proteinesG100g' | 'lipidesG100g' | 'fibresG100g' | 'cendresG100g', string> = {
		proteinesG100g: 'protéines',
		lipidesG100g: 'lipides',
		fibresG100g: 'fibres brutes',
		cendresG100g: 'cendres brutes'
	};
	const champsManquantsEssentiels = (
		['proteinesG100g', 'lipidesG100g', 'fibresG100g', 'cendresG100g'] as const
	).filter((cle) => champs[cle].value === null);
	if (champsManquantsEssentiels.length > 0) {
		const libelles = champsManquantsEssentiels.map((cle) => LIBELLES_ESSENTIELS[cle]).join(', ');
		warnings.push(`Valeur(s) essentielle(s) manquante(s) : ${libelles}.`);
	}

	return {
		name: extraireNom(lignes),
		brand: { value: null, raw: null },
		type: extraireType(texteSansAccents),
		statutLegal: extraireStatutLegal(texteSansAccents),
		emKcal100g,
		proteinesG100g: champs.proteinesG100g,
		lipidesG100g: champs.lipidesG100g,
		humiditeG100g: champs.humiditeG100g,
		fibresG100g: champs.fibresG100g,
		cendresG100g: champs.cendresG100g,
		glucidesG100g: champs.glucidesG100g,
		warnings
	};
}
