import { db } from '$lib/server/db';
import { dailyPlan, dailyPlanSlot } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { DailyPlanInput } from '$lib/domain/dailyPlan.calc';

export async function listDailyPlansForCat(catId: string) {
	return db.query.dailyPlan.findMany({
		where: eq(dailyPlan.catId, catId),
		orderBy: (plan, { desc }) => [desc(plan.createdAt)],
		with: { slots: { orderBy: (slot, { asc }) => [asc(slot.position)] } }
	});
}

export async function findDailyPlanById(id: string) {
	return db.query.dailyPlan.findFirst({
		where: eq(dailyPlan.id, id),
		with: { slots: { orderBy: (slot, { asc }) => [asc(slot.position)] } }
	});
}

export async function findActiveDailyPlanForCat(catId: string) {
	return db.query.dailyPlan.findFirst({
		where: and(eq(dailyPlan.catId, catId), eq(dailyPlan.isActive, true)),
		with: { slots: { orderBy: (slot, { asc }) => [asc(slot.position)] } }
	});
}

export async function createDailyPlanWithSlots(input: DailyPlanInput, ownerUserId: string) {
	return db.transaction(async (tx) => {
		const [createdPlan] = await tx
			.insert(dailyPlan)
			.values({
				id: crypto.randomUUID(),
				catId: input.catId,
				name: input.name,
				createdByUserId: ownerUserId
			})
			.returning();

		if (input.slots.length > 0) {
			await tx.insert(dailyPlanSlot).values(
				input.slots.map((slot, position) => ({
					id: crypto.randomUUID(),
					dailyPlanId: createdPlan.id,
					timeOfDay: slot.timeOfDay,
					foodType: slot.foodType,
					position
				}))
			);
		}

		return createdPlan;
	});
}

export async function updateDailyPlanWithSlots(id: string, input: DailyPlanInput) {
	return db.transaction(async (tx) => {
		const [updatedPlan] = await tx
			.update(dailyPlan)
			.set({ name: input.name })
			.where(eq(dailyPlan.id, id))
			.returning();

		await tx.delete(dailyPlanSlot).where(eq(dailyPlanSlot.dailyPlanId, id));

		if (input.slots.length > 0) {
			await tx.insert(dailyPlanSlot).values(
				input.slots.map((slot, position) => ({
					id: crypto.randomUUID(),
					dailyPlanId: id,
					timeOfDay: slot.timeOfDay,
					foodType: slot.foodType,
					position
				}))
			);
		}

		return updatedPlan;
	});
}

export async function setActiveDailyPlan(catId: string, dailyPlanId: string) {
	await db.transaction(async (tx) => {
		await tx.update(dailyPlan).set({ isActive: false }).where(eq(dailyPlan.catId, catId));
		await tx.update(dailyPlan).set({ isActive: true }).where(eq(dailyPlan.id, dailyPlanId));
	});
}

export async function deleteDailyPlan(id: string) {
	await db.delete(dailyPlan).where(eq(dailyPlan.id, id));
}
