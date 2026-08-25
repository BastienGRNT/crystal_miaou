// Formules issues de specs/nutrition-spec.md (sections 1 à 4, 6.1 à 6.4).

const DEFAULT_DER_FACTOR = 1.2;

// --- 1. RER / DER --------------------------------------------------------

// Borne haute réaliste pour un chat (contre 45kg dans la formule générique chien+chat d'origine — un
// chat ne pèse jamais 45kg, même en obésité extrême le record homologué tourne autour de 21kg).
const POIDS_MAX_FORMULE_LINEAIRE_KG = 15;

export function calculerRER(poidsKg: number): number {
	if (poidsKg < 2 || poidsKg > POIDS_MAX_FORMULE_LINEAIRE_KG) {
		return 70 * Math.pow(poidsKg, 0.75);
	}
	return 30 * poidsKg + 70;
}

export function calculerDER(rer: number, facteur: number): number {
	return rer * facteur;
}

// --- Facteur DER -----------------------------------------------------------

export type DERActivityLevel = 'faible' | 'modere' | 'eleve';
export type DERGoal = 'maintien' | 'perte' | 'prise';
export type DERReproductiveStatus = 'aucun' | 'gestation';

export interface DERFactorProfile {
	ageMonths: number | null;
	sterilized: boolean | null;
	activityLevel: DERActivityLevel | null;
	goal: DERGoal | null;
	reproductiveStatus: DERReproductiveStatus | null;
	/** Distinct de activityLevel (specs/nutrition-spec.md section 1.2) : un chat d'intérieur strict
	 * dépense moins d'énergie qu'un chat qui sort, même à activité perçue identique. null = inconnu,
	 * traité comme neutre (pas de correctif). */
	hasOutdoorAccess: boolean | null;
}

const SENIOR_AGE_MONTHS = 84; // 7 ans

// Chat d'intérieur strict : tire le facteur vers le bas d'un quart de plage (specs section 1.2).
const CORRECTIF_INTERIEUR_STRICT = 0.25;

/** Positionne le facteur dans une plage de la spec selon l'activité (faible → borne basse, élevée →
 * borne haute), corrigé vers le bas si le chat n'a pas accès à l'extérieur. */
function positionDansPlage(
	min: number,
	max: number,
	activityLevel: DERActivityLevel | null,
	hasOutdoorAccess: boolean | null
): number {
	let t = activityLevel === 'faible' ? 0 : activityLevel === 'eleve' ? 1 : 0.5;
	if (hasOutdoorAccess === false) {
		t = Math.max(0, t - CORRECTIF_INTERIEUR_STRICT);
	}
	return Math.round((min + (max - min) * t) * 100) / 100;
}

export function resoudreFacteurDER(profil: DERFactorProfile): number {
	const { ageMonths, sterilized, activityLevel, goal, reproductiveStatus, hasOutdoorAccess } = profil;

	// Croissance : priorité absolue, un chaton n'est jamais restreint pour un objectif de poids.
	if (ageMonths !== null && ageMonths < 4) {
		return positionDansPlage(2.5, 3.0, activityLevel, hasOutdoorAccess);
	}
	if (ageMonths !== null && ageMonths < 12) {
		return 2.0;
	}

	// Gestation : besoin énergétique critique, prioritaire sur l'âge senior ou un objectif de poids.
	if (reproductiveStatus === 'gestation') {
		return positionDansPlage(1.6, 2.0, activityLevel, hasOutdoorAccess);
	}

	// Objectif de poids explicite : décision assumée par le propriétaire/vétérinaire.
	if (goal === 'perte') {
		return positionDansPlage(0.8, 1.0, activityLevel, hasOutdoorAccess);
	}
	if (goal === 'prise') {
		return positionDansPlage(1.2, 1.8, activityLevel, hasOutdoorAccess);
	}

	if (ageMonths !== null && ageMonths >= SENIOR_AGE_MONTHS) {
		if (activityLevel === 'faible') {
			return 1.0;
		}
		return positionDansPlage(1.1, 1.4, activityLevel, hasOutdoorAccess);
	}

	if (sterilized === true) {
		if (activityLevel === 'faible') {
			return positionDansPlage(1.0, 1.2, null, hasOutdoorAccess);
		}
		return positionDansPlage(1.2, 1.4, activityLevel, hasOutdoorAccess);
	}

	if (sterilized === false) {
		return 1.4;
	}

	return DEFAULT_DER_FACTOR;
}

// --- 2. Énergie métabolisable (Atwater modifiée) --------------------------

export interface EstimationEMAtwaterInput {
	proteinesG: number;
	lipidesG: number;
	glucidesG?: number | null;
	cendresG?: number | null;
	humiditeG?: number | null;
	fibresG?: number | null;
}

export function calculerGlucidesParDifference(input: EstimationEMAtwaterInput): number {
	const glucides =
		100 -
		input.proteinesG -
		input.lipidesG -
		(input.cendresG ?? 0) -
		(input.humiditeG ?? 0) -
		(input.fibresG ?? 0);
	return Math.max(glucides, 0);
}

export function estimerEMAtwater(input: EstimationEMAtwaterInput): number {
	const glucidesG = input.glucidesG ?? calculerGlucidesParDifference(input);
	return input.proteinesG * 3.5 + input.lipidesG * 8.5 + glucidesG * 3.5;
}

// --- 2 bis. Énergie métabolisable : équation NRC 2006 (méthode FEDIAF en 4 étapes) -----------
//
// L'Atwater modifiée ci-dessus sous-estime systématiquement l'EM des aliments secs pour chat (elle
// vient de la nutrition humaine et ignore la digestibilité réelle). L'équation NRC 2006 est celle
// qu'utilisent FEDIAF et les calculateurs officiels de la profession, et la littérature comparative
// (PLOS One 2019, sur aliments chien + chat) la classe comme la plus proche de l'EM mesurée in vivo.
// C'est elle qui sert désormais à combler un kcal/100g absent de l'étiquette (voir food.calc.ts) —
// l'Atwater reste exportée pour comparaison/tests, mais n'alimente plus les rations.
//
// Les quatre coefficients ci-dessous sont SPÉCIFIQUES AU CHAT (le chien utilise 91.2 / 1.43 / 1.04) :
// ne pas les réutiliser pour une autre espèce.

/** Étape 1 — énergie brute (kcal/100g). Somme des potentiels énergétiques bruts, avant digestibilité. */
export function calculerEnergieBrute(input: EstimationEMAtwaterInput): number {
	const glucidesG = input.glucidesG ?? calculerGlucidesParDifference(input);
	return input.proteinesG * 5.7 + input.lipidesG * 9.4 + (glucidesG + (input.fibresG ?? 0)) * 4.1;
}

/** Étape 2 — digestibilité énergétique du chat (%), pilotée par les fibres exprimées en % de matière
 * sèche (et non en % du produit brut : c'est l'échelle de l'équation NRC). Bornée à [0, 100] pour
 * qu'une étiquette aberrante ne produise jamais une digestibilité négative ou > 100%. */
export function calculerDigestibiliteEnergetiqueChat(fibresPctMatiereSeche: number): number {
	return Math.max(0, Math.min(100, 87.9 - 0.88 * fibresPctMatiereSeche));
}

/** Étapes 1 à 4 — EM (kcal/100g) selon NRC 2006 : énergie brute, moins l'énergie perdue dans les
 * fèces (digestibilité), moins l'énergie perdue dans les urines (0.77 kcal par g de protéines chez
 * le chat). Jamais négative. */
export function estimerEMNRC2006(input: EstimationEMAtwaterInput): number {
	const humiditeG = input.humiditeG ?? 0;
	const matiereSecheG = 100 - humiditeG;
	const fibresPctMatiereSeche = matiereSecheG > 0 ? ((input.fibresG ?? 0) / matiereSecheG) * 100 : 0;

	const energieBrute = calculerEnergieBrute(input);
	const digestibilite = calculerDigestibiliteEnergetiqueChat(fibresPctMatiereSeche);
	const energieDigestible = (energieBrute * digestibilite) / 100;

	return Math.max(0, energieDigestible - 0.77 * input.proteinesG);
}

// --- 3. Arrondi des quantités ----------------------------------------------

export function arrondirGrammes(grammes: number): number {
	return Math.round(grammes * 2) / 2;
}

// --- 4. Validation de la ration (section 6) --------------------------------

export function convertirNutrimentPour1000kcal(nutrimentGPour100g: number, kcalPour100g: number): number {
	return (nutrimentGPour100g / kcalPour100g) * 1000;
}

// ATTENTION distinct de EXCES : réservé aux indicateurs qualité sans franchissement d'un seuil médical
// dur (ex: glucides — la spec section 6.3 dit explicitement "à traiter comme un indicateur qualité
// plus qu'une alerte stricte"), pour ne pas donner un faux sentiment d'urgence identique à EXCES.
export type StatutNutriment = 'DEFICIT' | 'EXCES' | 'ATTENTION' | 'OK';

export type NomNutrimentValide =
	| 'proteines'
	| 'lipides'
	| 'calcium'
	| 'phosphore'
	| 'taurine'
	| 'glucides'
	| 'ratioCalciumPhosphore';

export interface SeuilNutriment {
	min: number | null;
	max: number | null;
}

export interface StatusParNutriment {
	nutriment: NomNutrimentValide;
	valeur: number;
	statut: StatutNutriment;
	/** Bornes de référence utilisées pour ce statut — permet à l'UI d'afficher la cible, pas seulement
	 * "OK"/"DEFICIT" à l'aveugle. */
	seuil: SeuilNutriment;
	/** Position de `valeur` dans la plage [0, 100] : 0 = à la borne min (ou 0 si pas de min), 100 = à la
	 * borne max (ou au minimum atteint si pas de max). Clampée — sert uniquement à dessiner une jauge,
	 * la couleur/le statut restent la source de vérité pour "est-ce que c'est bon". */
	positionPct: number;
}

export interface RationAValider {
	totalNutriments: {
		proteinesG: number;
		lipidesG: number;
		calciumG?: number | null;
		phosphoreG?: number | null;
		taurineG?: number | null;
		glucidesG?: number | null;
	};
	totalKcal: number;
	/** La pâtée est moins bien assimilée pour la taurine que la croquette (section 6.3) : fait basculer
	 * le seuil minimum de 1.0 à 1.7 g/1000kcal dès qu'un aliment humide compose la ration. */
	contientAlimentHumide?: boolean;
	/** Matière sèche totale de la ration (g) = quantité − eau. Sert uniquement au seuil qualité glucides
	 * (section 6.3, exprimé en % de matière sèche, pas en g/1000kcal comme les autres nutriments).
	 * Absent/null = pas de seuil calculé pour les glucides (ex: anciens appels sans cette donnée). */
	totalMatiereSecheG?: number | null;
}

// Table de référence, section 6.3 (bornes basses des minimums recommandés retenues comme seuil de garde-fou).
const SEUILS_NUTRIMENTS: Record<'proteines' | 'lipides' | 'calcium' | 'phosphore', SeuilNutriment> = {
	proteines: { min: 50, max: null },
	lipides: { min: 22, max: null },
	calcium: { min: 1.4, max: 6 },
	phosphore: { min: 1.3, max: 2.5 }
};

function seuilTaurine(contientAlimentHumide: boolean): SeuilNutriment {
	return { min: contientAlimentHumide ? 1.7 : 1.0, max: null };
}

function determinerStatut(valeur: number, seuil: SeuilNutriment): StatutNutriment {
	if (seuil.min !== null && valeur < seuil.min) return 'DEFICIT';
	if (seuil.max !== null && valeur > seuil.max) return 'EXCES';
	return 'OK';
}

/** Position de `valeur` dans la plage de référence, clampée à [0, 100] pour dessiner une jauge. */
export function calculerPositionSeuil(valeur: number, seuil: SeuilNutriment): number {
	if (seuil.min !== null && seuil.max !== null) {
		if (seuil.max === seuil.min) return 100;
		return Math.max(0, Math.min(100, ((valeur - seuil.min) / (seuil.max - seuil.min)) * 100));
	}
	if (seuil.min !== null) {
		if (seuil.min === 0) return 100;
		return Math.max(0, Math.min(100, (valeur / seuil.min) * 100));
	}
	if (seuil.max !== null) {
		if (seuil.max === 0) return 100;
		return Math.max(0, Math.min(100, (valeur / seuil.max) * 100));
	}
	return 100;
}

/** % d'un nutriment rapporté à la matière sèche d'un aliment (100g − humidité) — c'est une propriété de
 * l'aliment lui-même, indépendante de la quantité donnée : sert à identifier lequel, parmi plusieurs
 * aliments actifs, tire un ratio de la ration vers le haut (section 6.3). */
export function calculerPctMatiereSeche(nutrimentG100g: number, humiditeG100g: number): number {
	const matiereSecheG100g = 100 - humiditeG100g;
	if (matiereSecheG100g <= 0) return 0;
	return (nutrimentG100g / matiereSecheG100g) * 100;
}

/** À quel point `valeur` dépasse (>1) ou reste sous (<1) le seuil franchi — null si la valeur respecte
 * la cible. Sert uniquement à contextualiser un chiffre brut pour l'UI (ex: "2,4× la cible"). */
export function calculerRatioEcartSeuil(valeur: number, seuil: SeuilNutriment): number | null {
	if (seuil.max !== null && valeur > seuil.max && seuil.max > 0) {
		return valeur / seuil.max;
	}
	if (seuil.min !== null && valeur < seuil.min && seuil.min > 0) {
		return valeur / seuil.min;
	}
	return null;
}

// Glucides : le chat n'a aucun besoin physiologique de glucides, pas de seuil réglementaire. L'idéal
// scientifique (FEDIAF/AAFCO, catinfo.org) reste <10-12% de matière sèche, mais c'est quasiment
// inatteignable pour une croquette extrudée classique (l'amidon sert de liant à la cuisson, y compris
// sans céréales) — d'où des seuils d'usage plus réalistes, alignés sur ce qui s'observe réellement sur
// le marché (section 6.3) : en dessous de 25%, c'est correct pour du sec ; 25-30%, un peu élevé ; au-delà
// de 30%, à éviter si possible.
export const GLUCIDES_PCT_MS_SEUIL_ATTENTION = 25;
export const GLUCIDES_PCT_MS_SEUIL_EXCES = 30;

export function validerRation(ration: RationAValider): StatusParNutriment[] {
	const { totalNutriments, totalKcal } = ration;
	const resultats: StatusParNutriment[] = [];

	const proteinesG1000Kcal = convertirNutrimentPour1000kcal(totalNutriments.proteinesG, totalKcal);
	resultats.push({
		nutriment: 'proteines',
		valeur: proteinesG1000Kcal,
		statut: determinerStatut(proteinesG1000Kcal, SEUILS_NUTRIMENTS.proteines),
		seuil: SEUILS_NUTRIMENTS.proteines,
		positionPct: calculerPositionSeuil(proteinesG1000Kcal, SEUILS_NUTRIMENTS.proteines)
	});

	const lipidesG1000Kcal = convertirNutrimentPour1000kcal(totalNutriments.lipidesG, totalKcal);
	resultats.push({
		nutriment: 'lipides',
		valeur: lipidesG1000Kcal,
		statut: determinerStatut(lipidesG1000Kcal, SEUILS_NUTRIMENTS.lipides),
		seuil: SEUILS_NUTRIMENTS.lipides,
		positionPct: calculerPositionSeuil(lipidesG1000Kcal, SEUILS_NUTRIMENTS.lipides)
	});

	let calciumG1000Kcal: number | null = null;
	if (totalNutriments.calciumG !== null && totalNutriments.calciumG !== undefined) {
		calciumG1000Kcal = convertirNutrimentPour1000kcal(totalNutriments.calciumG, totalKcal);
		resultats.push({
			nutriment: 'calcium',
			valeur: calciumG1000Kcal,
			statut: determinerStatut(calciumG1000Kcal, SEUILS_NUTRIMENTS.calcium),
			seuil: SEUILS_NUTRIMENTS.calcium,
			positionPct: calculerPositionSeuil(calciumG1000Kcal, SEUILS_NUTRIMENTS.calcium)
		});
	}

	let phosphoreG1000Kcal: number | null = null;
	if (totalNutriments.phosphoreG !== null && totalNutriments.phosphoreG !== undefined) {
		phosphoreG1000Kcal = convertirNutrimentPour1000kcal(totalNutriments.phosphoreG, totalKcal);
		resultats.push({
			nutriment: 'phosphore',
			valeur: phosphoreG1000Kcal,
			statut: determinerStatut(phosphoreG1000Kcal, SEUILS_NUTRIMENTS.phosphore),
			seuil: SEUILS_NUTRIMENTS.phosphore,
			positionPct: calculerPositionSeuil(phosphoreG1000Kcal, SEUILS_NUTRIMENTS.phosphore)
		});
	}

	if (totalNutriments.taurineG !== null && totalNutriments.taurineG !== undefined) {
		const taurineG1000Kcal = convertirNutrimentPour1000kcal(totalNutriments.taurineG, totalKcal);
		const seuil = seuilTaurine(ration.contientAlimentHumide ?? false);
		resultats.push({
			nutriment: 'taurine',
			valeur: taurineG1000Kcal,
			statut: determinerStatut(taurineG1000Kcal, seuil),
			seuil,
			positionPct: calculerPositionSeuil(taurineG1000Kcal, seuil)
		});
	}

	if (calciumG1000Kcal !== null && phosphoreG1000Kcal !== null) {
		const ratio = calciumG1000Kcal / phosphoreG1000Kcal;
		const seuilRatio: SeuilNutriment = { min: 1.0, max: 2.0 };
		resultats.push({
			nutriment: 'ratioCalciumPhosphore',
			valeur: ratio,
			statut: ratio < 1.0 ? 'DEFICIT' : ratio > 2.0 ? 'EXCES' : 'OK',
			seuil: seuilRatio,
			positionPct: calculerPositionSeuil(ratio, seuilRatio)
		});
	}

	// Glucides : aucun besoin physiologique chez le chat, indicateur qualité uniquement (pas d'alerte
	// stricte comme DEFICIT/EXCES) — exprimé en % de matière sèche, pas en g/1000kcal comme les autres
	// nutriments, car c'est l'échelle utilisée par la spec pour ce seuil qualité (section 6.3).
	if (totalNutriments.glucidesG !== null && totalNutriments.glucidesG !== undefined) {
		if (ration.totalMatiereSecheG !== null && ration.totalMatiereSecheG !== undefined && ration.totalMatiereSecheG > 0) {
			const glucidesPctMS = (totalNutriments.glucidesG / ration.totalMatiereSecheG) * 100;
			// Seuil affiché comme cible = le repère "correct pour du sec" (25%) ; le second palier à 30%
			// ("à éviter si possible") nuance le même statut ATTENTION via le texte plutôt qu'un statut à
			// part — les glucides restent un indicateur qualité, jamais un seuil médical dur (EXCES).
			const seuil: SeuilNutriment = { min: null, max: GLUCIDES_PCT_MS_SEUIL_ATTENTION };
			resultats.push({
				nutriment: 'glucides',
				valeur: glucidesPctMS,
				statut: glucidesPctMS > GLUCIDES_PCT_MS_SEUIL_ATTENTION ? 'ATTENTION' : 'OK',
				seuil,
				positionPct: calculerPositionSeuil(glucidesPctMS, seuil)
			});
		} else {
			const glucidesG1000Kcal = convertirNutrimentPour1000kcal(totalNutriments.glucidesG, totalKcal);
			resultats.push({
				nutriment: 'glucides',
				valeur: glucidesG1000Kcal,
				statut: 'OK',
				seuil: { min: null, max: null },
				positionPct: 100
			});
		}
	}

	return resultats;
}

// --- Agrégation de la ration totale à partir des quantités par aliment (section 6.2) ---

export interface ItemRationCalculee {
	quantiteG: number;
	emKcal100g: number;
	proteinesG100g: number;
	lipidesG100g: number;
	calciumG100g?: number | null;
	phosphoreG100g?: number | null;
	taurineG100g?: number | null;
	glucidesG100g?: number | null;
	/** Sert uniquement à déterminer le seuil de taurine applicable (section 6.3). */
	estAlimentHumide?: boolean;
	/** Sert uniquement au calcul de la matière sèche totale (seuil qualité glucides, section 6.3). */
	humiditeG100g?: number | null;
}

/** Additionne les apports de chaque aliment. Un nutriment optionnel manquant sur un seul aliment
 * rend le total "inconnu" plutôt que de sous-estimer silencieusement la ration (section 6.1). */
export function agregerRation(items: ItemRationCalculee[]): RationAValider {
	let totalKcal = 0;
	let proteinesG = 0;
	let lipidesG = 0;
	let calciumG = 0;
	let phosphoreG = 0;
	let taurineG = 0;
	let glucidesG = 0;
	let matiereSecheG = 0;
	let calciumConnu = true;
	let phosphoreConnu = true;
	let taurineConnu = true;
	let glucidesConnu = true;
	let matiereSecheConnue = true;
	let contientAlimentHumide = false;

	for (const item of items) {
		totalKcal += (item.emKcal100g / 100) * item.quantiteG;
		proteinesG += (item.proteinesG100g / 100) * item.quantiteG;
		lipidesG += (item.lipidesG100g / 100) * item.quantiteG;

		if (item.estAlimentHumide) {
			contientAlimentHumide = true;
		}

		if (item.humiditeG100g === null || item.humiditeG100g === undefined) {
			matiereSecheConnue = false;
		} else {
			matiereSecheG += ((100 - item.humiditeG100g) / 100) * item.quantiteG;
		}

		if (item.calciumG100g === null || item.calciumG100g === undefined) {
			calciumConnu = false;
		} else {
			calciumG += (item.calciumG100g / 100) * item.quantiteG;
		}

		if (item.phosphoreG100g === null || item.phosphoreG100g === undefined) {
			phosphoreConnu = false;
		} else {
			phosphoreG += (item.phosphoreG100g / 100) * item.quantiteG;
		}

		if (item.taurineG100g === null || item.taurineG100g === undefined) {
			taurineConnu = false;
		} else {
			taurineG += (item.taurineG100g / 100) * item.quantiteG;
		}

		if (item.glucidesG100g === null || item.glucidesG100g === undefined) {
			glucidesConnu = false;
		} else {
			glucidesG += (item.glucidesG100g / 100) * item.quantiteG;
		}
	}

	return {
		totalKcal,
		contientAlimentHumide,
		totalMatiereSecheG: matiereSecheConnue ? matiereSecheG : null,
		totalNutriments: {
			proteinesG,
			lipidesG,
			calciumG: calciumConnu ? calciumG : null,
			phosphoreG: phosphoreConnu ? phosphoreG : null,
			taurineG: taurineConnu ? taurineG : null,
			glucidesG: glucidesConnu ? glucidesG : null
		}
	};
}
