import {
	createDailyPlanWithSlots,
	deleteDailyPlan,
	findDailyPlanById,
	listDailyPlansForCat,
	setActiveDailyPlan,
	updateDailyPlanWithSlots
} from '$lib/server/repositories/dailyPlan.repository';
import { isCatMemberForUser } from '$lib/server/repositories/cat.repository';
import { validateDailyPlanInput, type DailyPlanInput } from '$lib/domain/dailyPlan.calc';
import type { dailyPlan as dailyPlanTable } from '$lib/server/db/schema';

export interface DailyPlanMutationResult {
	success: boolean;
	dailyPlan?: typeof dailyPlanTable.$inferSelect;
	errors?: {
		catId?: string;
		name?: string;
		slots?: string;
		slotErrors?: Partial<Record<keyof DailyPlanInput['slots'][number], string>>[];
	};
}

export interface DailyPlanActionResult {
	success: boolean;
	error?: string;
}

export async function listDailyPlansForCatUser(catId: string, userId: string) {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) return null;

	return listDailyPlansForCat(catId);
}

export async function getDailyPlanForUser(id: string, userId: string) {
	const plan = await findDailyPlanById(id);
	if (!plan) return null;

	const isMember = await isCatMemberForUser(plan.catId, userId);
	if (!isMember) return null;

	return plan;
}

export async function createDailyPlanForUser(
	input: DailyPlanInput,
	userId: string
): Promise<DailyPlanMutationResult> {
	const { valid, errors } = validateDailyPlanInput(input);
	if (!valid) {
		return { success: false, errors };
	}

	const isMember = await isCatMemberForUser(input.catId, userId);
	if (!isMember) {
		return { success: false, errors: { catId: 'Chat introuvable.' } };
	}

	const created = await createDailyPlanWithSlots(input, userId);
	return { success: true, dailyPlan: created };
}

export async function updateDailyPlanForUser(
	id: string,
	input: DailyPlanInput,
	userId: string
): Promise<DailyPlanMutationResult> {
	const { valid, errors } = validateDailyPlanInput(input);
	if (!valid) {
		return { success: false, errors };
	}

	const existing = await findDailyPlanById(id);
	if (!existing) {
		return { success: false, errors: { catId: 'Routine introuvable.' } };
	}

	const isMember = await isCatMemberForUser(existing.catId, userId);
	if (!isMember) {
		return { success: false, errors: { catId: 'Routine introuvable.' } };
	}

	const updated = await updateDailyPlanWithSlots(id, input);
	return { success: true, dailyPlan: updated };
}

export async function activateDailyPlanForUser(
	id: string,
	userId: string
): Promise<DailyPlanActionResult> {
	const existing = await findDailyPlanById(id);
	if (!existing) {
		return { success: false, error: 'Routine introuvable.' };
	}

	const isMember = await isCatMemberForUser(existing.catId, userId);
	if (!isMember) {
		return { success: false, error: 'Routine introuvable.' };
	}

	await setActiveDailyPlan(existing.catId, id);
	return { success: true };
}

export async function deleteDailyPlanForUser(id: string, userId: string): Promise<DailyPlanActionResult> {
	const existing = await findDailyPlanById(id);
	if (!existing) {
		return { success: false, error: 'Routine introuvable.' };
	}

	const isMember = await isCatMemberForUser(existing.catId, userId);
	if (!isMember) {
		return { success: false, error: 'Routine introuvable.' };
	}

	await deleteDailyPlan(id);
	return { success: true };
}
