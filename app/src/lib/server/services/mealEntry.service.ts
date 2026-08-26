import {
	createMealEntry,
	listMealEntriesForCatOnDate,
	findMealEntryById,
	updateMealEntry,
	deleteMealEntry
} from '$lib/server/repositories/mealEntry.repository';
import { isCatMemberForUser } from '$lib/server/repositories/cat.repository';
import { findFoodByIdForUser } from '$lib/server/repositories/food.repository';
import { validateMealEntryInput, type MealEntryInput } from '$lib/domain/mealEntry.calc';
import { arrondirAuDemiPaquet } from '$lib/domain/repartition.calc';
import type { mealEntry } from '$lib/server/db/schema';

export interface MealEntryMutationResult {
	success: boolean;
	mealEntry?: typeof mealEntry.$inferSelect;
	errors?: Partial<Record<keyof MealEntryInput, string>>;
}

export async function createMealEntryForUser(
	input: MealEntryInput,
	userId: string
): Promise<MealEntryMutationResult> {
	const { valid, errors } = validateMealEntryInput(input);

	if (!valid) {
		return { success: false, errors };
	}

	const isMember = await isCatMemberForUser(input.catId, userId);
	if (!isMember) {
		return { success: false, errors: { catId: 'Chat introuvable.' } };
	}

	const food = await findFoodByIdForUser(input.foodId, userId);
	if (!food) {
		return { success: false, errors: { foodId: 'Aliment introuvable.' } };
	}

	const created = await createMealEntry({
		catId: input.catId,
		foodId: input.foodId,
		quantityG: input.quantityG,
		consumedAt: new Date(input.consumedAt),
		recordedByUserId: userId
	});

	return { success: true, mealEntry: created };
}

export async function listMealEntriesForUser(catId: string, date: string, userId: string) {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) {
		return null;
	}

	return listMealEntriesForCatOnDate(catId, new Date(date));
}

export interface MealEntryActionResult {
	success: boolean;
	mealEntry?: typeof mealEntry.$inferSelect;
	error?: string;
}

export interface UpdateMealEntryForUserInput {
	/** Ajustement manuel (slider) : verrouille le créneau, le moteur de répartition ne le recalcule plus. */
	quantityG?: number;
	/** Coché/décoché "donné" : fige (ou libère) définitivement la quantité, avec attribution (qui, quand). */
	validated?: boolean;
}

export async function updateMealEntryForUser(
	id: string,
	input: UpdateMealEntryForUserInput,
	userId: string
): Promise<MealEntryActionResult> {
	if (input.quantityG !== undefined && (!Number.isFinite(input.quantityG) || input.quantityG < 0)) {
		return { success: false, error: 'La quantité doit être un nombre positif ou nul.' };
	}

	const existing = await findMealEntryById(id);
	if (!existing) {
		return { success: false, error: 'Repas introuvable.' };
	}

	const isMember = await isCatMemberForUser(existing.catId, userId);
	if (!isMember) {
		return { success: false, error: 'Repas introuvable.' };
	}

	const repositoryInput: Parameters<typeof updateMealEntry>[1] = {};
	if (input.quantityG !== undefined) {
		// Pâtée : toujours un multiple d'un demi-paquet, jamais un quart ou un tiers, même si le client
		// envoie une valeur hors grille (ex: drag imprécis avant que le pas du slider ne s'applique).
		repositoryInput.quantityG =
			existing.food.type === 'patee' && existing.food.packageSizeG !== null
				? arrondirAuDemiPaquet(input.quantityG, Number(existing.food.packageSizeG))
				: input.quantityG;
		repositoryInput.locked = true;
	}
	if (input.validated !== undefined) {
		repositoryInput.validated = input.validated;
		// Décocher "donné" déverrouille le créneau : il redevient recalculable par le moteur de répartition.
		repositoryInput.locked = input.validated;
		repositoryInput.validatedByUserId = input.validated ? userId : null;
		repositoryInput.validatedAt = input.validated ? new Date() : null;
	}

	const updated = await updateMealEntry(id, repositoryInput);
	return { success: true, mealEntry: updated };
}

export async function deleteMealEntryForUser(id: string, userId: string): Promise<MealEntryActionResult> {
	const existing = await findMealEntryById(id);
	if (!existing) {
		return { success: false, error: 'Repas introuvable.' };
	}

	const isMember = await isCatMemberForUser(existing.catId, userId);
	if (!isMember) {
		return { success: false, error: 'Repas introuvable.' };
	}

	await deleteMealEntry(id);
	return { success: true };
}
