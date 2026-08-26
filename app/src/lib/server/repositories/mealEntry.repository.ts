import { db } from '$lib/server/db';
import { mealEntry } from '$lib/server/db/schema';
import { and, eq, gte, lt } from 'drizzle-orm';

export interface CreateMealEntryInput {
	catId: string;
	foodId: string;
	quantityG: number | null;
	consumedAt: Date;
	recordedByUserId: string;
	sourceDailyPlanSlotId?: string | null;
	/** Coché "donné" dès la génération : réservé aux créneaux distribués par un distributeur automatique
	 * (specs foyer — la croquette part toute seule, pas besoin d'action manuelle, juste de pouvoir
	 * décocher si ça n'a pas fonctionné). Faux par défaut pour tout le reste (gamelle/gamelle ludique). */
	validated?: boolean;
}

export async function createMealEntry(input: CreateMealEntryInput) {
	const [created] = await db
		.insert(mealEntry)
		.values({
			id: crypto.randomUUID(),
			catId: input.catId,
			foodId: input.foodId,
			quantityG: input.quantityG === null ? null : input.quantityG.toString(),
			consumedAt: input.consumedAt,
			recordedByUserId: input.recordedByUserId,
			sourceDailyPlanSlotId: input.sourceDailyPlanSlotId ?? null,
			validated: input.validated ?? false,
			locked: input.validated ?? false
		})
		.returning();

	return created;
}

export async function createMealEntries(inputs: CreateMealEntryInput[]) {
	if (inputs.length === 0) return [];

	return db
		.insert(mealEntry)
		.values(
			inputs.map((input) => ({
				id: crypto.randomUUID(),
				catId: input.catId,
				foodId: input.foodId,
				quantityG: input.quantityG === null ? null : input.quantityG.toString(),
				consumedAt: input.consumedAt,
				recordedByUserId: input.recordedByUserId,
				sourceDailyPlanSlotId: input.sourceDailyPlanSlotId ?? null,
				validated: input.validated ?? false,
				locked: input.validated ?? false
			}))
		)
		.returning();
}

/** Supprime les repas déjà générés pour ce chat sur cette journée (régénération idempotente du menu du jour). */
export async function deleteMealEntriesForCatOnDate(catId: string, date: Date): Promise<void> {
	const startOfDay = new Date(date);
	startOfDay.setHours(0, 0, 0, 0);
	const endOfDay = new Date(startOfDay);
	endOfDay.setDate(endOfDay.getDate() + 1);

	await db
		.delete(mealEntry)
		.where(
			and(
				eq(mealEntry.catId, catId),
				gte(mealEntry.consumedAt, startOfDay),
				lt(mealEntry.consumedAt, endOfDay)
			)
		);
}

export async function listMealEntriesForCatOnDate(catId: string, date: Date) {
	const startOfDay = new Date(date);
	startOfDay.setHours(0, 0, 0, 0);
	const endOfDay = new Date(startOfDay);
	endOfDay.setDate(endOfDay.getDate() + 1);

	return db.query.mealEntry.findMany({
		where: and(
			eq(mealEntry.catId, catId),
			gte(mealEntry.consumedAt, startOfDay),
			lt(mealEntry.consumedAt, endOfDay)
		),
		orderBy: (entry, { asc }) => [asc(entry.consumedAt)],
		with: { food: true, sourceDailyPlanSlot: true, validatedBy: true }
	});
}

/** Lit toutes les entrées d'un chat sur une plage de jours (bornes incluses) — lecture seule, ne
 * génère jamais rien : sert à l'historique/l'analyse, pas au menu du jour en cours. */
export async function listMealEntriesForCatInRange(catId: string, startDate: Date, endDate: Date) {
	const startOfFirstDay = new Date(startDate);
	startOfFirstDay.setHours(0, 0, 0, 0);
	const startOfDayAfterLast = new Date(endDate);
	startOfDayAfterLast.setHours(0, 0, 0, 0);
	startOfDayAfterLast.setDate(startOfDayAfterLast.getDate() + 1);

	return db.query.mealEntry.findMany({
		where: and(
			eq(mealEntry.catId, catId),
			gte(mealEntry.consumedAt, startOfFirstDay),
			lt(mealEntry.consumedAt, startOfDayAfterLast)
		),
		orderBy: (entry, { asc }) => [asc(entry.consumedAt)],
		with: { food: true }
	});
}

export async function findMealEntryById(id: string) {
	return db.query.mealEntry.findFirst({
		where: eq(mealEntry.id, id),
		// sourceDailyPlanSlot : nécessaire pour connaître le mode de distribution du créneau (mealEntry.service
		// s'en sert pour arrondir un ajustement manuel de croquette à la dose du distributeur automatique).
		with: { food: true, sourceDailyPlanSlot: true }
	});
}

export interface UpdateMealEntryInput {
	quantityG?: number;
	locked?: boolean;
	validated?: boolean;
	validatedByUserId?: string | null;
	validatedAt?: Date | null;
}

export async function updateMealEntry(id: string, input: UpdateMealEntryInput) {
	const values: {
		quantityG?: string;
		locked?: boolean;
		validated?: boolean;
		validatedByUserId?: string | null;
		validatedAt?: Date | null;
	} = {};
	if (input.quantityG !== undefined) values.quantityG = input.quantityG.toString();
	if (input.locked !== undefined) values.locked = input.locked;
	if (input.validated !== undefined) values.validated = input.validated;
	if (input.validatedByUserId !== undefined) values.validatedByUserId = input.validatedByUserId;
	if (input.validatedAt !== undefined) values.validatedAt = input.validatedAt;

	const [updated] = await db.update(mealEntry).set(values).where(eq(mealEntry.id, id)).returning();

	return updated;
}

/** Persiste en une passe les quantités recalculées par le moteur de répartition pour les créneaux
 * non verrouillés (les verrouillés/donnés ne sont jamais dans cette liste). */
export async function updateMealEntryQuantities(updates: { id: string; quantityG: number }[]): Promise<void> {
	if (updates.length === 0) return;

	await Promise.all(
		updates.map((update) =>
			db.update(mealEntry).set({ quantityG: update.quantityG.toString() }).where(eq(mealEntry.id, update.id))
		)
	);
}

export async function deleteMealEntry(id: string) {
	await db.delete(mealEntry).where(eq(mealEntry.id, id));
}
