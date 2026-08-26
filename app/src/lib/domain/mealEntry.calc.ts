export interface MealEntryInput {
	catId: string;
	foodId: string;
	// Non renseignée à la saisie manuelle : calculée plus tard par le moteur de répartition
	// (specs/nutrition-spec.md section 3) une fois le repas sélectionné.
	quantityG: number | null;
	consumedAt: string;
}

export interface MealEntryValidationResult {
	valid: boolean;
	errors: Partial<Record<keyof MealEntryInput, string>>;
}

export function validateMealEntryInput(input: MealEntryInput): MealEntryValidationResult {
	const errors: Partial<Record<keyof MealEntryInput, string>> = {};

	if (!input.catId) {
		errors.catId = 'Le chat est obligatoire.';
	}

	if (!input.foodId) {
		errors.foodId = "L'aliment est obligatoire.";
	}

	if (input.quantityG !== null && (!Number.isFinite(input.quantityG) || input.quantityG <= 0)) {
		errors.quantityG = 'La quantité doit être un nombre supérieur à 0.';
	}

	if (!input.consumedAt || Number.isNaN(Date.parse(input.consumedAt))) {
		errors.consumedAt = 'Date/heure invalide.';
	}

	return { valid: Object.keys(errors).length === 0, errors };
}
