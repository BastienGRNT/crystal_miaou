const HEURE_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type DailyPlanSlotFoodType = 'croquette' | 'patee' | 'friandise';
const FOOD_TYPES_VALIDES: DailyPlanSlotFoodType[] = ['croquette', 'patee', 'friandise'];

export type DailyPlanSlotDistributionMode = 'gamelle' | 'distributeur_automatique' | 'gamelle_ludique';
const DISTRIBUTION_MODES_VALIDES: DailyPlanSlotDistributionMode[] = [
	'gamelle',
	'distributeur_automatique',
	'gamelle_ludique'
];

export interface DailyPlanSlotInput {
	timeOfDay: string;
	foodType: DailyPlanSlotFoodType;
	distributionMode: DailyPlanSlotDistributionMode;
}

export interface DailyPlanInput {
	catId: string;
	name: string;
	slots: DailyPlanSlotInput[];
}

export interface DailyPlanValidationResult {
	valid: boolean;
	errors: {
		catId?: string;
		name?: string;
		slots?: string;
		slotErrors?: Partial<Record<keyof DailyPlanSlotInput, string>>[];
	};
}

export function validateDailyPlanInput(input: DailyPlanInput): DailyPlanValidationResult {
	const errors: DailyPlanValidationResult['errors'] = {};

	if (!input.catId) {
		errors.catId = 'Le chat est obligatoire.';
	}

	if (!input.name.trim()) {
		errors.name = 'Le nom de la routine est obligatoire.';
	}

	if (input.slots.length === 0) {
		errors.slots = 'Ajoutez au moins un créneau de repas.';
	}

	const slotErrors = input.slots.map((slot) => {
		const slotError: Partial<Record<keyof DailyPlanSlotInput, string>> = {};

		if (!HEURE_REGEX.test(slot.timeOfDay)) {
			slotError.timeOfDay = 'Heure invalide (format HH:MM).';
		}

		if (!FOOD_TYPES_VALIDES.includes(slot.foodType)) {
			slotError.foodType = "Choisissez l'aliment donné à ce créneau.";
		}

		if (!DISTRIBUTION_MODES_VALIDES.includes(slot.distributionMode)) {
			slotError.distributionMode = 'Choisissez le mode de distribution de ce créneau.';
		}

		return slotError;
	});

	if (slotErrors.some((slotError) => Object.keys(slotError).length > 0)) {
		errors.slotErrors = slotErrors;
	}

	return { valid: Object.keys(errors).length === 0, errors };
}
