import type { DERFactorProfile } from './nutrition.calc';

export type CatSex = 'male' | 'femelle';
export type CatActivityLevel = 'faible' | 'modere' | 'eleve';
export type CatSpecialCondition = 'aucune' | 'gestation' | 'croissance' | 'surpoids';

export const CAT_SEX_VALUES: readonly CatSex[] = ['male', 'femelle'];
export const CAT_ACTIVITY_LEVEL_VALUES: readonly CatActivityLevel[] = ['faible', 'modere', 'eleve'];
export const CAT_SPECIAL_CONDITION_VALUES: readonly CatSpecialCondition[] = [
	'aucune',
	'gestation',
	'croissance',
	'surpoids'
];

/** Ajustement manuel du DER, en % — specs/nutrition-spec.md section 5 : après 2-3 semaines de suivi de
 * poids, on ajuste "d'environ ±10% si besoin". Valeurs fermées (pas un curseur libre) pour rester dans
 * la fourchette usuelle documentée par la spec ; c'est toujours l'utilisateur qui choisit, jamais l'app
 * qui recalcule seule à partir des pesées (cf. `WeightHistoryPanel`, qui ne fait que suggérer). */
export const CAT_DER_AJUSTEMENT_PCT_VALEURS: readonly number[] = [-10, -5, 0, 5, 10];

export interface CatOnboardingInput {
	name: string;
	weightKg: number;
	birthDate: string | null;
	ageYears: number | null;
	sex: CatSex;
	sterilized: boolean;
	activityLevel: CatActivityLevel;
	hasOutdoorAccess: boolean;
	specialCondition: CatSpecialCondition;
}

export interface CatOnboardingValidationResult {
	valid: boolean;
	errors: Partial<Record<keyof CatOnboardingInput, string>>;
}

export function validateCatOnboardingInput(input: CatOnboardingInput): CatOnboardingValidationResult {
	const errors: Partial<Record<keyof CatOnboardingInput, string>> = {};

	if (!input.name.trim()) {
		errors.name = 'Le nom est obligatoire.';
	}

	if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
		errors.weightKg = 'Le poids doit être un nombre supérieur à 0.';
	}

	if (!input.birthDate && (input.ageYears === null || !Number.isFinite(input.ageYears))) {
		errors.birthDate = "Indiquez une date de naissance ou un âge.";
	}

	if (input.ageYears !== null && (!Number.isFinite(input.ageYears) || input.ageYears < 0)) {
		errors.ageYears = "L'âge doit être un nombre positif.";
	}

	if (!CAT_SEX_VALUES.includes(input.sex)) {
		errors.sex = 'Sexe invalide.';
	}

	if (!CAT_ACTIVITY_LEVEL_VALUES.includes(input.activityLevel)) {
		errors.activityLevel = "Niveau d'activité invalide.";
	}

	if (!CAT_SPECIAL_CONDITION_VALUES.includes(input.specialCondition)) {
		errors.specialCondition = 'Condition particulière invalide.';
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

export function estimateBirthDateFromAge(ageYears: number, referenceDate: Date): string {
	const estimated = new Date(referenceDate);
	estimated.setFullYear(estimated.getFullYear() - Math.floor(ageYears));
	return estimated.toISOString().slice(0, 10);
}

export function resolveCatBirthDate(
	input: Pick<CatOnboardingInput, 'birthDate' | 'ageYears'>,
	referenceDate: Date
): string | null {
	if (input.birthDate) return input.birthDate;
	if (input.ageYears !== null && Number.isFinite(input.ageYears)) {
		return estimateBirthDateFromAge(input.ageYears, referenceDate);
	}
	return null;
}

// --- Édition du profil d'un chat existant (onglet "Mes chats") ---

export interface CatProfileInput {
	name: string;
	weightKg: number;
	birthDate: string;
	sex: CatSex;
	sterilized: boolean;
	activityLevel: CatActivityLevel;
	hasOutdoorAccess: boolean;
	specialCondition: CatSpecialCondition;
}

export interface CatProfileValidationResult {
	valid: boolean;
	errors: Partial<Record<keyof CatProfileInput, string>>;
}

export function validateCatProfileInput(input: CatProfileInput): CatProfileValidationResult {
	const errors: Partial<Record<keyof CatProfileInput, string>> = {};

	if (!input.name.trim()) {
		errors.name = 'Le nom est obligatoire.';
	}

	if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
		errors.weightKg = 'Le poids doit être un nombre supérieur à 0.';
	}

	if (!input.birthDate) {
		errors.birthDate = 'La date de naissance est obligatoire.';
	}

	if (!CAT_SEX_VALUES.includes(input.sex)) {
		errors.sex = 'Sexe invalide.';
	}

	if (!CAT_ACTIVITY_LEVEL_VALUES.includes(input.activityLevel)) {
		errors.activityLevel = "Niveau d'activité invalide.";
	}

	if (!CAT_SPECIAL_CONDITION_VALUES.includes(input.specialCondition)) {
		errors.specialCondition = 'Condition particulière invalide.';
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

// --- Sélection persistante des aliments actifs (pâtée/croquette/friandise) ---

export interface CatFoodSelectionInput {
	croquetteFoodId: string | null;
	pateeFoodId: string | null;
	friandiseFoodId: string | null;
	friandiseQuantiteTotaleG: number | null;
	/** Nombre de paquets de pâtée/jour fixé explicitement par l'utilisateur, ou null pour laisser le
	 * moteur de répartition le calculer automatiquement à partir du DER. */
	pateeNombrePaquetsOverride: number | null;
}

export interface CatFoodSelectionValidationResult {
	valid: boolean;
	errors: Partial<Record<keyof CatFoodSelectionInput, string>>;
}

/** Au moins pâtée ou croquette doit être actif (jamais aucun) ; la friandise est optionnelle mais sa
 * quantité doit être renseignée dès qu'elle est sélectionnée. */
export function validateCatFoodSelectionInput(input: CatFoodSelectionInput): CatFoodSelectionValidationResult {
	const errors: CatFoodSelectionValidationResult['errors'] = {};

	if (!input.croquetteFoodId && !input.pateeFoodId) {
		errors.croquetteFoodId = 'Choisissez au moins une pâtée ou une croquette.';
		errors.pateeFoodId = 'Choisissez au moins une pâtée ou une croquette.';
	}

	if (input.friandiseFoodId && (!input.friandiseQuantiteTotaleG || input.friandiseQuantiteTotaleG <= 0)) {
		errors.friandiseQuantiteTotaleG = 'Indiquez la quantité de friandise donnée par jour.';
	}

	if (input.pateeNombrePaquetsOverride !== null) {
		if (!input.pateeFoodId) {
			errors.pateeNombrePaquetsOverride = 'Activez une pâtée avant de fixer un nombre de paquets.';
		} else if (
			!Number.isFinite(input.pateeNombrePaquetsOverride) ||
			input.pateeNombrePaquetsOverride <= 0 ||
			Math.round(input.pateeNombrePaquetsOverride * 2) !== input.pateeNombrePaquetsOverride * 2
		) {
			errors.pateeNombrePaquetsOverride = 'Le nombre de paquets doit être un multiple de 0,5.';
		}
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

// --- Profil DER dérivé du profil chat (specs/nutrition-spec.md section 1.2) ---

export function calculerAgeMoisDepuisNaissance(
	birthDate: string | null,
	referenceDate: Date
): number | null {
	if (!birthDate) return null;
	const birth = new Date(birthDate);
	const months =
		(referenceDate.getFullYear() - birth.getFullYear()) * 12 +
		(referenceDate.getMonth() - birth.getMonth());
	return Math.max(months, 0);
}

export interface CatProfileForDERFactor {
	birthDate: string | null;
	sterilized: boolean;
	activityLevel: CatActivityLevel;
	hasOutdoorAccess: boolean;
	specialCondition: CatSpecialCondition;
}

/** surpoids → objectif perte de poids ; gestation → statut reproducteur ; ces deux champs
 * n'ont pas d'équivalent direct dans le schéma cat, `specialCondition` est la seule source. */
export function deriveDERFactorProfileFromCat(
	cat: CatProfileForDERFactor,
	referenceDate: Date
): DERFactorProfile {
	return {
		ageMonths: calculerAgeMoisDepuisNaissance(cat.birthDate, referenceDate),
		sterilized: cat.sterilized,
		activityLevel: cat.activityLevel,
		hasOutdoorAccess: cat.hasOutdoorAccess,
		goal: cat.specialCondition === 'surpoids' ? 'perte' : null,
		reproductiveStatus: cat.specialCondition === 'gestation' ? 'gestation' : 'aucune'
	};
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
	return EMAIL_PATTERN.test(email.trim());
}
