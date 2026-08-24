import {
	calculerGlucidesParDifference,
	estimerEMAtwater,
	estimerEMNRC2006
} from '$lib/domain/nutrition.calc';

export type FoodType = 'croquette' | 'patee' | 'friandise';
export type FoodLegalStatus = 'complet' | 'complementaire';

export const FOOD_TYPE_VALUES: readonly FoodType[] = ['croquette', 'patee', 'friandise'];
export const FOOD_LEGAL_STATUS_VALUES: readonly FoodLegalStatus[] = ['complet', 'complementaire'];

export interface FoodInput {
	name: string;
	brand: string;
	type: FoodType;
	emKcal100g: number | null;
	packageSizeG: number | null;
	proteinesG100g: number;
	lipidesG100g: number;
	/** Optionnel : pas légalement obligatoire sur l'étiquette en dessous de 14% d'humidité (donc quasi
	 * jamais présent pour une croquette sèche). Null = comblé par un défaut générique par type d'aliment
	 * (voir `resolveFoodHumidity`), jamais silencieusement — `humiditeEstimee` en sortie le signale. */
	humiditeG100g: number | null;
	fibresG100g: number;
	cendresG100g: number;
	glucidesG100g: number | null;
	calciumG100g: number | null;
	phosphoreG100g: number | null;
	taurineG100g: number | null;
	statutLegal: FoodLegalStatus;
}

export interface FoodValidationResult {
	valid: boolean;
	errors: Partial<Record<keyof FoodInput, string>>;
}

function estPositifOuNul(valeur: number): boolean {
	return Number.isFinite(valeur) && valeur >= 0;
}

export function validateFoodInput(input: FoodInput): FoodValidationResult {
	const errors: Partial<Record<keyof FoodInput, string>> = {};

	if (!input.name.trim()) {
		errors.name = 'Le nom est obligatoire.';
	}

	if (!input.brand.trim()) {
		errors.brand = 'La marque est obligatoire.';
	}

	if (!FOOD_TYPE_VALUES.includes(input.type)) {
		errors.type = 'Type invalide.';
	}

	if (input.emKcal100g !== null && (!Number.isFinite(input.emKcal100g) || input.emKcal100g <= 0)) {
		errors.emKcal100g = "L'énergie métabolisable doit être un nombre supérieur à 0.";
	}

	if (input.packageSizeG !== null && (!Number.isFinite(input.packageSizeG) || input.packageSizeG <= 0)) {
		errors.packageSizeG = 'Le poids du paquet doit être un nombre supérieur à 0.';
	}

	if (!estPositifOuNul(input.proteinesG100g)) {
		errors.proteinesG100g = 'Les protéines doivent être un nombre positif ou nul.';
	}

	if (!estPositifOuNul(input.lipidesG100g)) {
		errors.lipidesG100g = 'Les lipides doivent être un nombre positif ou nul.';
	}

	if (input.humiditeG100g !== null && !estPositifOuNul(input.humiditeG100g)) {
		errors.humiditeG100g = "L'humidité doit être un nombre positif ou nul.";
	}

	if (!estPositifOuNul(input.fibresG100g)) {
		errors.fibresG100g = 'Les fibres brutes doivent être un nombre positif ou nul — obligatoires sur une étiquette UE.';
	}

	if (!estPositifOuNul(input.cendresG100g)) {
		errors.cendresG100g = 'Les cendres brutes doivent être un nombre positif ou nul — obligatoires sur une étiquette UE.';
	}

	if (input.glucidesG100g !== null && !estPositifOuNul(input.glucidesG100g)) {
		errors.glucidesG100g = 'Les glucides doivent être un nombre positif ou nul.';
	}

	if (input.calciumG100g !== null && !estPositifOuNul(input.calciumG100g)) {
		errors.calciumG100g = 'Le calcium doit être un nombre positif ou nul.';
	}

	if (input.phosphoreG100g !== null && !estPositifOuNul(input.phosphoreG100g)) {
		errors.phosphoreG100g = 'Le phosphore doit être un nombre positif ou nul.';
	}

	if (input.taurineG100g !== null && !estPositifOuNul(input.taurineG100g)) {
		errors.taurineG100g = 'La taurine doit être un nombre positif ou nul.';
	}

	if (!FOOD_LEGAL_STATUS_VALUES.includes(input.statutLegal)) {
		errors.statutLegal = 'Statut légal invalide.';
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

// Défaut générique par type quand l'humidité n'est pas indiquée sur l'étiquette (pas obligatoire sous
// 14%, cas fréquent pour une croquette sèche) — valeurs usuelles de la catégorie, jamais présentées
// comme mesurées (voir `humiditeEstimee`).
const HUMIDITE_DEFAUT_PAR_TYPE: Record<FoodType, number> = {
	croquette: 8,
	patee: 78,
	friandise: 10
};

export interface ResolvedFoodHumidity {
	humiditeG100g: number;
	humiditeEstimee: boolean;
}

/** Comble humiditeG100g manquant via un défaut générique par type d'aliment. */
export function resolveFoodHumidity(type: FoodType, humiditeG100g: number | null): ResolvedFoodHumidity {
	if (humiditeG100g !== null) {
		return { humiditeG100g, humiditeEstimee: false };
	}
	return { humiditeG100g: HUMIDITE_DEFAUT_PAR_TYPE[type], humiditeEstimee: true };
}

export interface ResolvedFoodEnergyValues {
	emKcal100g: number;
	emEstimee: boolean;
	glucidesG100g: number;
	glucidesEstimees: boolean;
}

/** Comble emKcal100g / glucidesG100g manquants via l'estimation NRC 2006 (spec section 2). Prend
 * l'humidité déjà résolue (voir `resolveFoodHumidity`), jamais la valeur brute potentiellement nulle. */
export function resolveFoodEnergyValues(
	input: Pick<
		FoodInput,
		'emKcal100g' | 'proteinesG100g' | 'lipidesG100g' | 'fibresG100g' | 'cendresG100g' | 'glucidesG100g'
	> & { humiditeG100g: number }
): ResolvedFoodEnergyValues {
	const glucidesEstimees = input.glucidesG100g === null;
	const glucidesG100g =
		input.glucidesG100g ??
		calculerGlucidesParDifference({
			proteinesG: input.proteinesG100g,
			lipidesG: input.lipidesG100g,
			humiditeG: input.humiditeG100g,
			fibresG: input.fibresG100g,
			cendresG: input.cendresG100g
		});

	const emEstimee = input.emKcal100g === null;
	const emKcal100g =
		input.emKcal100g ??
		estimerEMNRC2006({
			proteinesG: input.proteinesG100g,
			lipidesG: input.lipidesG100g,
			glucidesG: glucidesG100g,
			humiditeG: input.humiditeG100g,
			fibresG: input.fibresG100g,
			cendresG: input.cendresG100g
		});

	return { emKcal100g, emEstimee, glucidesG100g, glucidesEstimees };
}

/** Détecte une EM déclarée (emEstimee=false) qui est en fait notre propre suggestion recopiée telle
 * quelle dans le champ "valeur du fabricant" — ex. duplication d'un aliment où l'utilisateur a repris
 * les chiffres de la pré-saisie plutôt que la vraie valeur imprimée. Une fois enregistrée avec
 * emEstimee=false, cette valeur perd tout signalement d'incertitude en aval alors qu'elle en est une :
 * ce garde-fou la retrouve en recalculant l'estimation à partir des macros stockées. Une correspondance
 * exacte (tolérance d'arrondi 0.5 kcal) est un signal fort — une vraie valeur fabricant coïncidant par
 * hasard avec une estimation à ce niveau de précision serait un hasard extrêmement improbable.
 *
 * Les deux formules sont testées : les aliments saisis avant le passage à NRC 2006 portent une valeur
 * recopiée depuis l'ancienne suggestion Atwater, qu'il faut continuer à signaler. */
export function detecterEmSuspecte(input: {
	emKcal100g: number;
	emEstimee: boolean;
	proteinesG100g: number;
	lipidesG100g: number;
	humiditeG100g: number;
	fibresG100g: number;
	cendresG100g: number;
	glucidesG100g: number;
}): boolean {
	if (input.emEstimee) return false;
	const macros = {
		proteinesG: input.proteinesG100g,
		lipidesG: input.lipidesG100g,
		glucidesG: input.glucidesG100g,
		humiditeG: input.humiditeG100g,
		fibresG: input.fibresG100g,
		cendresG: input.cendresG100g
	};
	return (
		Math.abs(input.emKcal100g - estimerEMNRC2006(macros)) < 0.5 ||
		Math.abs(input.emKcal100g - estimerEMAtwater(macros)) < 0.5
	);
}
