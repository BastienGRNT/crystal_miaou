import {
	createCatWithOwner,
	deleteCatsCreatedByUser,
	findCatById,
	isCatMemberForUser,
	listCatsForUser,
	updateCatFoodSelection,
	updateCatProfile
} from '$lib/server/repositories/cat.repository';
import { findFoodByIdForUser } from '$lib/server/repositories/food.repository';
import {
	resolveCatBirthDate,
	validateCatFoodSelectionInput,
	validateCatOnboardingInput,
	validateCatProfileInput,
	type CatFoodSelectionInput,
	type CatOnboardingInput,
	type CatProfileInput
} from '$lib/domain/cat.calc';
import type { cat } from '$lib/server/db/schema';

export interface CreateCatResult {
	success: boolean;
	cat?: typeof cat.$inferSelect;
	errors?: Partial<Record<keyof CatOnboardingInput, string>>;
}

export async function createCatForUser(
	input: CatOnboardingInput,
	ownerUserId: string
): Promise<CreateCatResult> {
	const { valid, errors } = validateCatOnboardingInput(input);

	if (!valid) {
		return { success: false, errors };
	}

	const birthDate = resolveCatBirthDate(input, new Date());

	const createdCat = await createCatWithOwner({
		name: input.name.trim(),
		weightKg: input.weightKg,
		birthDate,
		sex: input.sex,
		sterilized: input.sterilized,
		activityLevel: input.activityLevel,
		hasOutdoorAccess: input.hasOutdoorAccess,
		specialCondition: input.specialCondition,
		ownerUserId
	});

	return { success: true, cat: createdCat };
}

export async function resetCatsForUser(ownerUserId: string): Promise<void> {
	await deleteCatsCreatedByUser(ownerUserId);
}

export async function listCatsForOwner(userId: string) {
	return listCatsForUser(userId);
}

export interface UpdateCatProfileResult {
	success: boolean;
	cat?: typeof cat.$inferSelect;
	errors?: Partial<Record<keyof CatProfileInput, string>>;
}

export async function updateCatProfileForUser(
	catId: string,
	input: CatProfileInput,
	userId: string
): Promise<UpdateCatProfileResult> {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) {
		return { success: false, errors: { name: 'Chat introuvable.' } };
	}

	const { valid, errors } = validateCatProfileInput(input);
	if (!valid) {
		return { success: false, errors };
	}

	const updated = await updateCatProfile(catId, {
		name: input.name.trim(),
		weightKg: input.weightKg,
		birthDate: input.birthDate,
		sex: input.sex,
		sterilized: input.sterilized,
		activityLevel: input.activityLevel,
		hasOutdoorAccess: input.hasOutdoorAccess,
		specialCondition: input.specialCondition
	});

	return { success: true, cat: updated };
}

export interface UpdateCatFoodSelectionResult {
	success: boolean;
	cat?: typeof cat.$inferSelect;
	errors?: Partial<Record<keyof CatFoodSelectionInput, string>>;
}

/** Champs omis (absents du body reçu par l'API) : conservent la valeur actuelle en base plutôt que
 * d'être écrasés à null — seul un champ explicitement présent dans la requête est modifié. Permet à
 * la page "repas du jour" de ne patcher que `pateeNombrePaquetsOverride` sans renvoyer toute la
 * sélection d'aliments. */
export async function updateCatFoodSelectionForUser(
	catId: string,
	partialInput: Partial<CatFoodSelectionInput>,
	userId: string
): Promise<UpdateCatFoodSelectionResult> {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) {
		return { success: false, errors: { croquetteFoodId: 'Chat introuvable.' } };
	}

	const current = await findCatById(catId);
	if (!current) {
		return { success: false, errors: { croquetteFoodId: 'Chat introuvable.' } };
	}

	const input: CatFoodSelectionInput = {
		croquetteFoodId:
			'croquetteFoodId' in partialInput ? (partialInput.croquetteFoodId ?? null) : current.activeCroquetteFoodId,
		pateeFoodId: 'pateeFoodId' in partialInput ? (partialInput.pateeFoodId ?? null) : current.activePateeFoodId,
		friandiseFoodId:
			'friandiseFoodId' in partialInput ? (partialInput.friandiseFoodId ?? null) : current.activeFriandiseFoodId,
		friandiseQuantiteTotaleG:
			'friandiseQuantiteTotaleG' in partialInput
				? (partialInput.friandiseQuantiteTotaleG ?? null)
				: current.friandiseQuantiteTotaleG === null
					? null
					: Number(current.friandiseQuantiteTotaleG),
		pateeNombrePaquetsOverride:
			'pateeNombrePaquetsOverride' in partialInput
				? (partialInput.pateeNombrePaquetsOverride ?? null)
				: current.pateeNombrePaquetsOverride === null
					? null
					: Number(current.pateeNombrePaquetsOverride)
	};

	// La pâtée vient d'être désactivée : un ancien override n'a plus de sens et bloquerait sinon la
	// validation ci-dessous.
	if (!input.pateeFoodId) {
		input.pateeNombrePaquetsOverride = null;
	}

	const { valid, errors } = validateCatFoodSelectionInput(input);
	if (!valid) {
		return { success: false, errors };
	}

	for (const foodId of [input.croquetteFoodId, input.pateeFoodId, input.friandiseFoodId]) {
		if (!foodId) continue;
		const food = await findFoodByIdForUser(foodId, userId);
		if (!food) {
			return { success: false, errors: { croquetteFoodId: 'Aliment introuvable.' } };
		}
	}

	const updated = await updateCatFoodSelection(catId, {
		activeCroquetteFoodId: input.croquetteFoodId,
		activePateeFoodId: input.pateeFoodId,
		activeFriandiseFoodId: input.friandiseFoodId,
		friandiseQuantiteTotaleG: input.friandiseQuantiteTotaleG,
		pateeNombrePaquetsOverride: input.pateeNombrePaquetsOverride
	});

	return { success: true, cat: updated };
}
